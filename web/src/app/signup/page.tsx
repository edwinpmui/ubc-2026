import { AuthPage } from "@/components/AuthPage";
import { Frame } from "@/components/Frame";

export default function SignupPage() {
  return (
    <Frame>
      <AuthPage mode="signup" />
    </Frame>
  );
}
