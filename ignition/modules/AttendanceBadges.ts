import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DEFAULT_METADATA_URI = "ipfs://attendance-badges/{id}.json";

export default buildModule("AttendanceBadgesModule", (m) => {
  const initialOwner = m.getParameter("initialOwner", m.getAccount(0));
  const defaultUri = m.getParameter("defaultUri", DEFAULT_METADATA_URI);

  const attendanceBadges = m.contract("AttendanceBadges", [initialOwner, defaultUri]);

  return { attendanceBadges };
});
