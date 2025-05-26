import { Card, Elevation, H1 } from "@blueprintjs/core";

export default function OhsReports() {
  return (
    <Card elevation={Elevation.TWO} style={{ minWidth: 400, padding: 32 }}>
      <H1>OHS Reports</H1>
      <p>Here are the OHS reports.</p>
    </Card>
  );
}
