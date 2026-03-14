import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ApiReference() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>API Reference</CardTitle>
      </CardHeader>
      <CardContent>
        <Badge>POST /api/v1/email</Badge>
        <div className="mt-2">We provide a simple API for creating emails.</div>
      </CardContent>
    </Card>
  );
}
