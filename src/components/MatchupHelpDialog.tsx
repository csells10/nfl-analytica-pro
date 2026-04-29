import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Swords, Scale, ShieldCheck, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const GUIDE_EVENT = "gamelens:open-guide";

type Step = {
  icon: LucideIcon;
  title: string;
  body: React.ReactNode;
};

const STEPS: Step[] = [
  {
    icon: Activity,
    title: "Start with Game Profile",
    body: (
      <>
        Game Profile shows the main matchup signals:{" "}
        <span className="text-foreground">pressure</span>,{" "}
        <span className="text-foreground">turnover risk</span>, and{" "}
        <span className="text-foreground">scoring efficiency</span>.
      </>
    ),
  },
  {
    icon: Swords,
    title: "Check Core Area Advantage",
    body: (
      <>
        Core Areas show the broader team-strength picture. If Core Areas are
        split, the matchup may be closer than the signal lean suggests.
      </>
    ),
  },
  {
    icon: Scale,
    title: "Read Matchup Lean",
    body: (
      <>
        <p>
          Matchup Lean is the backend's final directional read. Pay attention
          to the wording:
        </p>
        <ul className="mt-1.5 space-y-1 pl-1">
          <li>
            <span className="text-foreground">"slight lean"</span> — limited
            confidence.
          </li>
          <li>
            <span className="text-foreground">"mixed profile"</span> — both
            teams have advantages.
          </li>
          <li>
            <span className="text-foreground">"broader matchup edge"</span> —
            signals and Core Areas are more aligned.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: "Use Confidence as a guardrail",
    body: (
      <>
        Low confidence does not mean useless. It means the matchup is close,
        noisy, or split.
      </>
    ),
  },
  {
    icon: Check,
    title: "After the game, review Model Trust",
    body: (
      <>
        Model Trust explains whether the model was correct, incorrect, or
        dealing with a balanced-profile miss.
      </>
    ),
  },
];

export function MatchupHelpDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(GUIDE_EVENT, handler);
    return () => window.removeEventListener(GUIDE_EVENT, handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>How to read this matchup</DialogTitle>
          <DialogDescription>
            A quick guide to the intended reading order.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-3">
          <ol className="space-y-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">
                        {step.title}
                      </h3>
                    </div>
                    <div className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default MatchupHelpDialog;
