import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl">404</CardTitle>
          <p className="text-muted-foreground">That calculation is not on the desk.</p>
        </CardHeader>
        <CardContent className="text-center">
          <p className="mb-6 text-sm text-muted-foreground">
            The page may have moved, or the calculator key may be incorrect.
          </p>
          <Button asChild>
            <Link href="/">Return home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
