import { Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SearchPage() {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-[1.5rem] border border-border/70 bg-card px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            placeholder="Search by client, credential title, platform, or notes"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Search remains prominent, but client context stays primary in the overall
          experience.
        </p>
      </CardContent>
    </Card>
  );
}
