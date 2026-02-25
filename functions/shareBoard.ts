import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { board_id, invitee_email } = await req.json();
    if (!board_id) return Response.json({ error: 'board_id required' }, { status: 400 });

    const boards = await base44.entities.SharedBoard.filter({ id: board_id });
    const board = boards[0];
    if (!board) return Response.json({ error: 'Board not found' }, { status: 404 });

    // Add member if email provided
    if (invitee_email) {
      const members = board.members || [];
      if (!members.includes(invitee_email)) {
        await base44.entities.SharedBoard.update(board_id, {
          members: [...members, invitee_email],
        });
      }

      // Send invite email
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: invitee_email,
        subject: `${user.full_name || user.email} invited you to "${board.name}" on ClipForge`,
        body: `
Hi there!

${user.full_name || user.email} has invited you to collaborate on the "${board.name}" board on ClipForge.

${board.description ? `Board description: ${board.description}\n` : ""}
Click the link below to view the shared board:
${Deno.env.get("APP_URL") || "https://app.base44.com"}/boards?board=${board_id}

ClipForge helps you save, organize, and share content from across the web.
        `.trim(),
      });
    }

    // Generate a shareable link token
    const shareToken = btoa(`${board_id}:${Date.now()}`).replace(/[=+/]/g, '');
    
    return Response.json({ 
      share_link: `${req.headers.get('origin') || ''}/boards?share=${shareToken}&board=${board_id}`,
      share_token: shareToken,
    });
  } catch (err) {
    console.error("shareBoard error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});