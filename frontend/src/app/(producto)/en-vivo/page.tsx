import { DM_Sans, Space_Grotesk } from "next/font/google";
import { LivePathScreen } from "@/features/live-path/components/LivePathScreen";

const text = DM_Sans({ subsets: ["latin"], weight: ["400", "500"] });
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"] });

export default async function LivePathPage({
  searchParams,
}: {
  searchParams: Promise<{ fixture?: string }>;
}) {
  const { fixture } = await searchParams;
  return (
    <div className={text.className} style={{ ["--live-display" as string]: display.style.fontFamily }}>
      <LivePathScreen fixture={fixture} />
    </div>
  );
}
