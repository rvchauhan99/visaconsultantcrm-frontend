import JsonLd from "@/components/seo/json-ld";
import { countryCoverUrl } from "@/lib/utils";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildVisaServiceJsonLd,
  visaPageDescription,
  visaPageTitle,
} from "@/lib/seo";
import { fetchVisaProduct } from "@/lib/visa-products-server";
import VisaDetailInner from "./visa-detail-inner";

export async function generateMetadata({ params }) {
  const { productId } = await params;
  const product = await fetchVisaProduct(productId);

  if (!product) {
    return {
      title: "Visa not found",
      robots: { index: false, follow: true },
    };
  }

  const title = visaPageTitle(product);
  const description = visaPageDescription(product);
  const image = countryCoverUrl(product);
  const url = absoluteUrl(`/visa/${product.id}`);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [{ url: image, alt: product.country_name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function VisaDetailPage({ params }) {
  const { productId } = await params;
  const product = await fetchVisaProduct(productId);

  return (
    <>
      <JsonLd data={buildVisaServiceJsonLd(product)} />
      <JsonLd data={buildBreadcrumbJsonLd(product)} />
      <VisaDetailInner initialProduct={product} />
    </>
  );
}
