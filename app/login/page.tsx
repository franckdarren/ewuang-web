import { GalleryVerticalEnd } from "lucide-react"
import Image from "next/image";
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 px-6 md:p-0">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <a href="#" className="flex items-center gap-2 self-center font-medium">
                    <Image
                        src="/images/logo1.png"
                        alt="Logo"
                        width={200}
                        height={200}
                    />
                </a>
                <LoginForm />
            </div>
        </div>
    )
}
