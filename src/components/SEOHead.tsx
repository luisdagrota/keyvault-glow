import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  image?: string;
  type?: "website" | "product" | "article";
  price?: number;
  url?: string;
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  category?: string;
  stock?: number;
  // New SEO fields for rich snippets
  sellerName?: string;
  sellerUrl?: string;
  rating?: number;
  reviewCount?: number;
  sku?: string;
  brand?: string;
  breadcrumbs?: { name: string; url: string }[];
}

// JSON-LD Schema types
interface WebsiteSchema {
  "@context": string;
  "@type": string;
  name: string;
  description: string;
  url: string;
  potentialAction?: {
    "@type": string;
    target: string;
    "query-input": string;
  };
}

interface ProductSchema {
  "@context": string;
  "@type": string;
  name: string;
  description: string;
  image?: string;
  sku?: string;
  brand?: {
    "@type": string;
    name: string;
  };
  offers: {
    "@type": string;
    price: number;
    priceCurrency: string;
    availability: string;
    seller?: {
      "@type": string;
      name: string;
      url?: string;
    };
    priceValidUntil?: string;
    itemCondition?: string;
  };
  aggregateRating?: {
    "@type": string;
    ratingValue: number;
    reviewCount: number;
    bestRating: number;
    worstRating: number;
  };
}

interface OrganizationSchema {
  "@context": string;
  "@type": string;
  name: string;
  url: string;
  logo: string;
  sameAs: string[];
  contactPoint: {
    "@type": string;
    contactType: string;
    url: string;
  };
}

interface BreadcrumbSchema {
  "@context": string;
  "@type": string;
  itemListElement: {
    "@type": string;
    position: number;
    name: string;
    item: string;
  }[];
}

export function SEOHead({ 
  title, 
  description, 
  image, 
  type = "website",
  price,
  url,
  keywords = [],
  author,
  publishedTime,
  category,
  stock,
  sellerName,
  sellerUrl,
  rating,
  reviewCount,
  sku,
  brand,
  breadcrumbs
}: SEOHeadProps) {
  useEffect(() => {
    const baseUrl = window.location.origin;
    const currentUrl = url || window.location.href;
    const defaultImage = `${baseUrl}/favicon.png`;
    const siteName = "GameKeys Store";
    const fullTitle = `${title} | ${siteName}`;

    // Update document title
    document.title = fullTitle;
    
    // Helper to update/create meta tags
    const updateMeta = (property: string, content: string, isProperty = true) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, property);
        document.head.appendChild(meta);
      }
      meta.content = content;
    };

    // Helper to update/create link tags
    const updateLink = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = href;
    };

    // Standard meta tags
    updateMeta('description', description, false);
    updateMeta('robots', 'index, follow', false);
    updateMeta('author', author || siteName, false);
    
    if (keywords.length > 0) {
      updateMeta('keywords', keywords.join(', '), false);
    } else {
      updateMeta('keywords', 'jogos digitais, keys, games, pc, playstation, xbox, steam, entrega imediata, contas de jogos', false);
    }
    
    // Canonical URL
    updateLink('canonical', currentUrl);

    // Open Graph tags
    updateMeta('og:site_name', siteName);
    updateMeta('og:title', fullTitle);
    updateMeta('og:description', description);
    updateMeta('og:type', type === 'product' ? 'product' : type === 'article' ? 'article' : 'website');
    updateMeta('og:url', currentUrl);
    updateMeta('og:image', image || defaultImage);
    updateMeta('og:image:alt', title);
    updateMeta('og:locale', 'pt_BR');
    
    // Twitter Card tags
    updateMeta('twitter:card', 'summary_large_image', false);
    updateMeta('twitter:title', fullTitle, false);
    updateMeta('twitter:description', description, false);
    updateMeta('twitter:image', image || defaultImage, false);

    // Product specific meta tags for rich snippets
    if (type === 'product' && price !== undefined) {
      updateMeta('product:price:amount', price.toFixed(2));
      updateMeta('product:price:currency', 'BRL');
      if (category) {
        updateMeta('product:category', category);
      }
      if (stock !== undefined) {
        updateMeta('product:availability', stock > 0 ? 'in stock' : 'out of stock');
      }
      if (sellerName) {
        updateMeta('product:retailer', sellerName);
      }
      if (brand) {
        updateMeta('product:brand', brand);
      }
    }

    // Article specific tags
    if (type === 'article') {
      if (publishedTime) {
        updateMeta('article:published_time', publishedTime);
      }
      if (author) {
        updateMeta('article:author', author);
      }
    }

    // JSON-LD Structured Data
    const removeExistingJsonLd = () => {
      document.querySelectorAll('script[type="application/ld+json"]').forEach(el => el.remove());
    };

    const addJsonLd = (schema: WebsiteSchema | ProductSchema | OrganizationSchema | BreadcrumbSchema) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(schema);
      document.head.appendChild(script);
    };

    removeExistingJsonLd();

    // Organization Schema (always include)
    const orgSchema: OrganizationSchema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: siteName,
      url: baseUrl,
      logo: defaultImage,
      sameAs: [
        "https://discord.gg/3B348wmnQ4"
      ],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        url: "https://discord.gg/3B348wmnQ4"
      }
    };
    addJsonLd(orgSchema);

    // Breadcrumb Schema
    if (breadcrumbs && breadcrumbs.length > 0) {
      const breadcrumbSchema: BreadcrumbSchema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: crumb.url
        }))
      };
      addJsonLd(breadcrumbSchema);
    }

    // Website Schema with search action
    if (type === 'website') {
      const websiteSchema: WebsiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteName,
        description: description,
        url: baseUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${baseUrl}/products?search={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      };
      addJsonLd(websiteSchema);
    }

    // Enhanced Product Schema with seller and ratings
    if (type === 'product' && price !== undefined) {
      const productSchema: ProductSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: title,
        description: description,
        image: image || defaultImage,
        sku: sku || title.toLowerCase().replace(/\s+/g, '-'),
        brand: {
          "@type": "Brand",
          name: brand || category || "GameKeys"
        },
        offers: {
          "@type": "Offer",
          price: price,
          priceCurrency: "BRL",
          availability: stock !== undefined && stock > 0 
            ? "https://schema.org/InStock" 
            : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          ...(sellerName && {
            seller: {
              "@type": "Organization",
              name: sellerName,
              ...(sellerUrl && { url: sellerUrl })
            }
          })
        },
        ...(rating !== undefined && reviewCount !== undefined && reviewCount > 0 && {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating,
            reviewCount: reviewCount,
            bestRating: 5,
            worstRating: 1
          }
        })
      };
      addJsonLd(productSchema);
    }

    // Cleanup function
    return () => {
      document.title = `${siteName} - Jogos Digitais`;
    };
  }, [title, description, image, type, price, url, keywords, author, publishedTime, category, stock, sellerName, sellerUrl, rating, reviewCount, sku, brand, breadcrumbs]);

  return null;
}
