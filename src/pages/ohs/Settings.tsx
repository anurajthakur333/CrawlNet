import { Card, Elevation, H1 } from "@blueprintjs/core";

export default function OHsSettings() {
  return (
    <Card elevation={Elevation.TWO} style={{ minWidth: 400, padding: 32 }}>
      <H1>Settings</H1>
      <p>Here are the OHS reports.</p>
    </Card>
  );
}
