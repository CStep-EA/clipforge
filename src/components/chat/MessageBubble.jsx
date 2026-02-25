import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Copy, Zap, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const FunctionDisplay = ({ toolCall }) => {
  const [expanded, setExpanded] = useState(false);
  const name = toolCall?.name || 'Function';
  const status = toolCall?.status || 'pending';
  const results = toolCall?.results;

  const parsedResults = (() => {
    if (!results) return null;
    try { return typeof results === 'string' ? JSON.parse(results) : results; } catch { return results; }
  })();

  const isError = results && (
    (typeof results === 'string' && /error|failed/i.test(results)) ||
    (parsedResults?.success === false)
  );

  const statusConfig = {
    pending: { icon: Clock, color: 'text-slate-400', text: 'Pending' },
    running: { icon: Loader2, color: 'text-[#00BFFF]', text: 'Running...', spin: true },
    in_progress: { icon: Loader2, color: 'text-[#00BFFF]', text: 'Running...', spin: true },
    completed: isError
      ? { icon: AlertCircle, color: 'text-red-400', text: 'Failed' }
      : { icon: CheckCircle2, color: 'text-emerald-400', text: 'Done' },
    success: { icon: CheckCircle2, color: 'text-emerald-400', text: 'Done' },
    failed: { icon: AlertCircle, color: 'text-red-400', text: 'Failed' },
    error: { icon: AlertCircle, color: 'text-red-400', text: 'Failed' },
  }[status] || { icon: Zap, color: 'text-slate-400', text: '' };

  const Icon = statusConfig.icon;

  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
          "hover:bg-[#1A1D27] border-[#2A2D3A]",
          expanded && "bg-[#1A1D27]"
        )}
      >
        <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
        <span className="text-[#E8E8ED]">{name.split('.').reverse().join(' ')}</span>
        {statusConfig.text && <span className="text-[#8B8D97]">• {statusConfig.text}</span>}
        {!statusConfig.spin && (toolCall.arguments_string || results) && (
          <ChevronRight className={cn("h-3 w-3 text-[#8B8D97] transition-transform ml-auto", expanded && "rotate-90")} />
        )}
      </button>
      {expanded && !statusConfig.spin && parsedResults && (
        <pre className="mt-1 ml-3 p-2 bg-[#0F1117] rounded-md text-[10px] text-[#8B8D97] overflow-auto max-h-32 border border-[#2A2D3A]">
          {typeof parsedResults === 'object' ? JSON.stringify(parsedResults, null, 2) : parsedResults}
        </pre>
      )}
    </div>
  );
};

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#00BFFF]/20 to-[#9370DB]/20 flex items-center justify-center mt-0.5 flex-shrink-0">
          <Zap className="h-3.5 w-3.5 text-[#00BFFF]" />
        </div>
      )}
      <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
        {message.content && (
          <div className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-gradient-to-r from-[#00BFFF] to-[#9370DB] text-white"
              : "glass-card"
          )}>
            {isUser ? (
              <p className="text-sm leading-relaxed">{message.content}</p>
            ) : (
              <ReactMarkdown
                className="text-sm prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                components={{
                  p: ({ children }) => <p className="my-1 leading-relaxed text-[#E8E8ED]">{children}</p>,
                  a: ({ children, ...props }) => (
                    <a {...props} target="_blank" className="text-[#00BFFF] hover:underline">{children}</a>
                  ),
                  code: ({ inline, children }) => inline ? (
                    <code className="px-1 py-0.5 rounded bg-[#2A2D3A] text-[#00BFFF] text-xs">{children}</code>
                  ) : (
                    <pre className="bg-[#0F1117] rounded-lg p-3 overflow-x-auto my-2 border border-[#2A2D3A]">
                      <code className="text-xs text-[#E8E8ED]">{children}</code>
                    </pre>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        )}
        {message.tool_calls?.length > 0 && (
          <div className="space-y-1">
            {message.tool_calls.map((tc, i) => <FunctionDisplay key={i} toolCall={tc} />)}
          </div>
        )}
      </div>
    </div>
  );
}