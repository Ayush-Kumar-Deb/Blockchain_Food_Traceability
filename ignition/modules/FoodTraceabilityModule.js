import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("FoodTraceabilityModule", (m) => {
  const foodTraceability = m.contract("FoodTraceability");
  return { foodTraceability };
});