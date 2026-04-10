import { useState, useMemo } from "react";
import { sampleTeamMetrics, type TeamMetric } from "@/lib/sample-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";

type SortKey = keyof TeamMetric;

export default function TeamMetrics() {
  const [sortKey, setSortKey] = useState<SortKey>("wins");
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    return [...sampleTeamMetrics].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }, [sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <TableHead
      className="cursor-pointer select-none text-xs hover:text-foreground"
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${sortKey === field ? "text-primary" : "text-muted-foreground/40"}`} />
      </span>
    </TableHead>
  );

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Team Metrics</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <SortHeader label="Team" field="team" />
              <SortHeader label="W" field="wins" />
              <SortHeader label="L" field="losses" />
              <SortHeader label="PF" field="pointsFor" />
              <SortHeader label="PA" field="pointsAgainst" />
              <SortHeader label="YPG" field="yardsPerGame" />
              <SortHeader label="TO±" field="turnoverDiff" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((t) => (
              <TableRow key={t.team} className="border-border">
                <TableCell className="text-sm font-semibold">{t.team}</TableCell>
                <TableCell className="font-mono text-sm">{t.wins}</TableCell>
                <TableCell className="font-mono text-sm">{t.losses}</TableCell>
                <TableCell className="font-mono text-sm">{t.pointsFor}</TableCell>
                <TableCell className="font-mono text-sm">{t.pointsAgainst}</TableCell>
                <TableCell className="font-mono text-sm">{t.yardsPerGame.toFixed(1)}</TableCell>
                <TableCell className={`font-mono text-sm ${t.turnoverDiff > 0 ? "text-accent" : t.turnoverDiff < 0 ? "text-destructive" : ""}`}>
                  {t.turnoverDiff > 0 ? "+" : ""}{t.turnoverDiff}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
