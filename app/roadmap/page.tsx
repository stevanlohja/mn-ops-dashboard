import PageHeader from "@/components/ui/PageHeader";
import ProductRoadmap from "@/components/roadmap/ProductRoadmap";

export const metadata = {
  title: "Roadmap — Nighthawk",
};

export default function RoadmapPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">
      <PageHeader
        title="Product Roadmap"
        subtitle="Directional workstreams for Nighthawk — intentions, not dated commitments"
      />
      <ProductRoadmap />
    </div>
  );
}