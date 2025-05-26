import { Card, Elevation, H1 } from "@blueprintjs/core";

export default function OhsPolicies() {
  return (
    <Card elevation={Elevation.TWO} style={{ minWidth: 400, padding: 32 }}>
      <H1>OHS Policies</H1>
      <p>Here are the OHS policies.</p>
    </Card>
  );
}
