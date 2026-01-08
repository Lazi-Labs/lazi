import { cookies } from "next/headers";

import { Mail } from "./components/mail";
import { accounts, mails } from "./data";

export const metadata = {
  title: "Mail App",
  description: "Easily organize incoming and outgoing mail with the mail management template."
};

export default async function MailPage() {
  const layout = (await cookies()).get("react-resizable-panels:layout:mail");
  const collapsed = (await cookies()).get("react-resizable-panels:collapsed");

  const defaultLayout = layout ? JSON.parse(layout.value) : undefined;
  const defaultCollapsed = collapsed ? JSON.parse(collapsed.value) : undefined;

  return (
    <div className="h-[calc(100vh-var(--header-height)-3rem)] rounded-md border">
      <Mail
        accounts={accounts}
        mails={mails}
        defaultLayout={defaultLayout}
        defaultCollapsed={defaultCollapsed}
        navCollapsedSize={4}
      />
    </div>
  );
}
