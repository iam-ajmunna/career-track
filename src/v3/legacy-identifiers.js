// Pure compatibility identifiers: no archived catalog or applicant data enters V3.
export const canonicalScholarshipId = (id) =>
  id === "oxford" ? "clarendon" : id;
export const isScholarshipVisible = (lifecycle = {}, id) =>
  !lifecycle[canonicalScholarshipId(id)] ||
  lifecycle[canonicalScholarshipId(id)].status === "active";
export const trackingStatus = (tracking = {}, id) =>
  tracking[canonicalScholarshipId(id)] || "none";
