import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  image?: string;
  type?: "website" | "product";
  price?: number;
  url?: string;
}

export function SEOHead({ 
  title, 
  description, 
  image, 
  type = "website",
  price,
  url 
}: SEOHeadProps) {
  useEffect(() => {
    // Update document title
    document.title = `${title} | GameKeys Store`;
    
    // Update/create meta tags
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

    // Standard meta tags
    updateMeta('description', description, false);
    
    // Open Graph tags
    updateMeta('og:title', `${title} | GameKeys Store`);
    updateMeta('og:description', description);
    updateMeta('og:type', type === 'product' ? 'product' : 'website');
    
    if (image) {
      updateMeta('og:image', image);
    }
    
    if (url) {
      updateMeta('og:url', url);
    }

    // Twitter Card tags
    updateMeta('twitter:card', 'summary_large_image', false);
    updateMeta('twitter:title', `${title} | GameKeys Store`, false);
    updateMeta('twitter:description', description, false);
    
    if (image) {
      updateMeta('twitter:image', image, false);
    }

    // Product specific tags
    if (type === 'product' && price) {
      updateMeta('product:price:amount', price.toFixed(2));
      updateMeta('product:price:currency', 'BRL');
    }

    // Cleanup function
    return () => {
      document.title = 'GameKeys Store - Jogos Digitais';
    };
  }, [title, description, image, type, price, url]);

  return null;
}
