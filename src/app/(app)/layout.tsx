import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Navigation from "@/components/Navigation";

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }

    return (
        <div className="flex flex-col md:flex-row min-h-screen">
            <Navigation user={session.user} />
            <main className="flex-1 p-4 md:p-8 pt-20 md:pt-8 bg-[#F8FAFC] pb-24 md:pb-8 md:ml-[240px] max-w-[100vw] overflow-x-hidden">
                {children}
            </main>
        </div>
    );
}

