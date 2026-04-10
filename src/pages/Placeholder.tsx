import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function Placeholder({ title }: { title: string }) {
  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Construction className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {title} section coming soon — this is a V1 placeholder.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
