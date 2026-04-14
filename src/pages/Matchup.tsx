import { useParams, useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction } from "lucide-react";

export default function Matchup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Slate
        </Button>

        <h1 className="text-lg font-bold tracking-tight text-foreground mb-6">
          Matchup Analysis
        </h1>

        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Construction className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Detailed matchup analysis for game {id} is coming soon.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              This page will include team comparisons, key stats, and game context.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
