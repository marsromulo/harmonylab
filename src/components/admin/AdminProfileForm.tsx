import Image from "next/image";
import { updateAdminProfileAction } from "@/app/admin/profile/actions";

type AdminProfileFormProps = {
  avatarUrl: string;
  displayName: string;
  email: string;
  updated?: boolean;
};

export function AdminProfileForm({ avatarUrl, displayName, email, updated }: AdminProfileFormProps) {
  return (
    <form action={updateAdminProfileAction} className="admin-product-form admin-profile-form">
      {updated ? <p className="admin-form-success">Profile updated.</p> : null}

      <div className="admin-profile-photo-row">
        <Image className="admin-profile-photo" src={avatarUrl} alt="Administrator profile photo" width={96} height={96} />
        <label>
          Profile Photo
          <input name="avatar" type="file" accept="image/*" />
        </label>
      </div>

      <label>
        Display Name
        <input name="display_name" required defaultValue={displayName} />
      </label>

      <div className="admin-readonly-field">
        <span>Email:</span>
        <strong>{email}</strong>
      </div>

      <div className="admin-form-actions">
        <button className="admin-btn" type="submit">
          Save Profile
        </button>
      </div>
    </form>
  );
}
