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
  offers: {
    "@type": string;
    price: number;
    priceCurrency: string;
    availability: string;
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
  stock
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
      updateMeta('keywords', 'jogos digitais, keys, games, pc, playstation, xbox, steam, entrega imediata', false);
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

    // Product specific tags
    if (type === 'product' && price !== undefined) {
      updateMeta('product:price:amount', price.toFixed(2));
      updateMeta('product:price:currency', 'BRL');
      if (category) {
        updateMeta('product:category', category);
      }
      if (stock !== undefined) {
        updateMeta('product:availability', stock > 0 ? 'in stock' : 'out of stock');
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

    const addJsonLd = (schema: WebsiteSchema | ProductSchema | OrganizationSchema) => {
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

    // Product Schema
    if (type === 'product' && price !== undefined) {
      const productSchema: ProductSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: title,
        description: description,
        image: image || defaultImage,
        offers: {
          "@type": "Offer",
          price: price,
          priceCurrency: "BRL",
          availability: stock !== undefined && stock > 0 
            ? "https://schema.org/InStock" 
            : "https://schema.org/OutOfStock"
        }
      };
      addJsonLd(productSchema);
    }

    // Cleanup function
    return () => {
      document.title = `${siteName} - Jogos Digitais`;
    };
  }, [title, description, image, type, price, url, keywords, author, publishedTime, category, stock]);

  return null;
}
