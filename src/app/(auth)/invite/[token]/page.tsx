import { AuthCard } from "@/components/auth/auth-card";
import { AcceptInvitationForm } from "@/components/auth/accept-invitation-form";
import { findInvitation } from "@/lib/auth/invitation";
import { MESSAGES } from "@/lib/auth/messages";

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const invitation = token.length >= 20 && token.length <= 200 ? await findInvitation(token) : null;

  if (!invitation) {
    return (
      <AuthCard title="Invitación no válida">
        <p className="text-sm">
          Este enlace caducó, ya se usó o no existe. {MESSAGES.invalidInvitation}
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Activa tu cuenta" description={`Invitación para ${invitation.email}`}>
      <AcceptInvitationForm token={token} />
    </AuthCard>
  );
}
