"use client";

import { useState } from "react";

type MemberCreatePanelProps = {
  action: (formData: FormData) => Promise<void>;
  memberCount: number;
};

export function MemberCreatePanel({ action, memberCount }: MemberCreatePanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <section className="admin-page-heading">
        <div>
          <p className="admin-eyebrow">MEMBER REFERRALS</p>
          <h1>Members</h1>
        </div>
        <div className="admin-heading-actions">
          <span>{memberCount} members</span>
          <button className="admin-btn" type="button" onClick={() => setIsOpen((current) => !current)}>
            {isOpen ? "Close" : "Add Member"}
          </button>
        </div>
      </section>

      {isOpen ? (
        <section className="admin-panel admin-form-panel admin-members-create">
          <h2>Add Member</h2>
          <form action={action} className="admin-member-form">
            <div className="admin-form-grid">
              <label>
                First Name
                <input name="first_name" required />
              </label>
              <label>
                Last Name
                <input name="last_name" required />
              </label>
              <label>
                Email
                <input name="email" type="email" autoComplete="email" />
              </label>
              <label>
                Phone No.
                <input name="phone" type="tel" />
              </label>
              <label>
                Referral Code
                <input name="referral_code" required />
              </label>
            </div>
            <div className="admin-form-actions">
              <button className="admin-btn" type="submit">
                Add Member
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
