import { html } from "../../ui/html.js";
import { chip } from "../../ui/components.js";
import { external } from "../../ui/fields.js";
export function leadCard(lead, listed = false) {
  return html`<article class="card match" data-match="${lead.id}">
    <h3>${lead.name}</h3>
    <p class="section__sub">${lead.provider || "Provider not confirmed"}</p>
    <div>${chip("Unverified lead", "warning")}</div>
    <p>
      ${lead.summary || "Confirm eligibility and funding on the official site."}
    </p>
    <p><strong>First task:</strong> Verify on the official site</p>
    <div class="match__actions">
      <button
        type="button"
        class="btn btn--primary btn--sm"
        data-add-to-list="${lead.id}"
        ${listed ? html`disabled` : ""}
      >
        ${listed ? "✓ Added" : "+ Add to my list"}</button
      >${external(lead.officialUrl, "Official page")}
    </div>
  </article>`;
}
