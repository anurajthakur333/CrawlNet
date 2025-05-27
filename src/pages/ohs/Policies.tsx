import { Card, Elevation, H1 } from "@blueprintjs/core";

export default function OhsOverview() {
  return (
    <Card elevation={Elevation.TWO} style={{ minWidth: 400, padding: 32 }}>
      <H1>OHS Overview</H1>
      <p>This is the OHS overview page.</p>
    </Card>
  );
}