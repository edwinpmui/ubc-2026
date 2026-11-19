import { AuthPage } from "@/components/AuthPage";
import { Frame } from "@/components/Frame";

export default function LoginPage() {
  return (
    <Frame>
      <AuthPage mode="login" />
    </Frame>
  );
}
