import { Card, Elevation, H1 } from "@blueprintjs/core";

export default function OrderDetails() {
  return (
    <Card elevation={Elevation.TWO} style={{ minWidth: 400, padding: 32 }}>
      <H1>Order Details</H1>
      <p>This is the Order Details page.</p>
    </Card>
  );
}