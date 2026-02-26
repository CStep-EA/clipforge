import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const { city, genre, keyword, size } = await req.json();
    if (!city) return Response.json({ error: 'city is required' }, { status: 400 });

    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');
    if (!apiKey) return Response.json({ error: 'TICKETMASTER_API_KEY not configured' }, { status: 500 });

    const params = new URLSearchParams({
      apikey: apiKey,
      city,
      size: String(size || 9),
      sort: 'date,asc',
    });
    if (genre && genre !== 'all') params.set('classificationName', genre);
    if (keyword) params.set('keyword', keyword);

    const url = `https://app.ticketmaster.com/discovery/v2/events.json?${params}`;
    console.log('Ticketmaster request:', url.replace(apiKey, '***'));

    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text();
      console.error('Ticketmaster error:', res.status, txt);
      return Response.json({ error: `Ticketmaster API error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const rawEvents = data._embedded?.events || [];

    const events = rawEvents.map(ev => {
      const venue = ev._embedded?.venues?.[0];
      const priceRange = ev.priceRanges?.[0];
      const image = ev.images?.find(i => i.ratio === '16_9' && i.width > 500) || ev.images?.[0];
      const ticketUrl = ev.url;
      const date = ev.dates?.start?.dateTime || ev.dates?.start?.localDate;

      return {
        name: ev.name,
        venue: venue?.name || 'TBD',
        city: venue?.city?.name || city,
        date: date || null,
        category: ev.classifications?.[0]?.segment?.name || 'Event',
        min_price: priceRange?.min || null,
        max_price: priceRange?.max || null,
        image_url: image?.url || null,
        ticketmaster_url: ticketUrl || null,
        ticketmaster_id: ev.id,
        status: 'suggested',
      };
    });

    return Response.json({ events });
  } catch (err) {
    console.error('ticketmaster function error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});