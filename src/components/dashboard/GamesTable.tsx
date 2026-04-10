import { useState, useMemo } from "react";
import { sampleGames, type Game } from "@/lib/sample-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";

export default function GamesTable() {
  const [search, setSearch] = useState("");
  const [weekFilter, setWeekFilter] = useState<number | null>(null);

  const weeks = useMemo(() => [...new Set(sampleGames.map((g) => g.week))].sort((a, b) => b - a), []);

  const filtered = useMemo(() => {
    let games: Game[] = sampleGames;
    if (weekFilter !== null) games = games.filter((g) => g.week === weekFilter);
    if (search) {
      const q = search.toLowerCase();
      games = games.filter((g) => g.homeTeam.toLowerCase().includes(q) || g.awayTeam.toLowerCase().includes(q));
    }
    return games;
  }, [search, weekFilter]);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-semibold">Recent Games</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search teams…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-40 pl-8 text-xs"
              />
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setWeekFilter(null)}
                className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  weekFilter === null ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All
              </button>
              {weeks.map((w) => (
                <button
                  key={w}
                  onClick={() => setWeekFilter(w)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                    weekFilter === w ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Wk {w}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-xs">Week</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Matchup</TableHead>
              <TableHead className="text-xs text-right">Score</TableHead>
              <TableHead className="text-xs text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((g) => (
              <TableRow key={g.id} className="border-border">
                <TableCell className="text-xs font-mono text-muted-foreground">{g.week}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{g.date}</TableCell>
                <TableCell className="text-sm font-medium">
                  {g.awayTeam} <span className="text-muted-foreground">@</span> {g.homeTeam}
                </TableCell>
                <TableCell className="text-right text-sm font-mono">
                  {g.awayScore}–{g.homeScore}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={g.status === "final" ? "secondary" : g.status === "live" ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {g.status.toUpperCase()}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
