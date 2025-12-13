import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

export const CategoryMenu = () => {
  const { categories, loading } = useCategories();

  if (loading || categories.length === 0) {
    return null;
  }

  return (
    <NavigationMenu className="hidden lg:flex">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger className="bg-transparent hover:bg-accent/50 data-[state=open]:bg-accent/50">
            <span className="flex items-center gap-1">
              Categorias
              <ChevronDown className="h-3 w-3" />
            </span>
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-[600px] gap-3 p-4 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <div key={category.id} className="space-y-2">
                  <Link
                    to={`/categoria/${category.slug}`}
                    className="flex items-center gap-2 text-sm font-semibold hover:text-primary transition-colors"
                  >
                    <span>{category.icon}</span>
                    {category.name}
                  </Link>
                  <ul className="space-y-1 pl-6">
                    {category.subcategories.slice(0, 5).map((sub) => (
                      <li key={sub.id}>
                        <NavigationMenuLink asChild>
                          <Link
                            to={`/categoria/${category.slug}/${sub.slug}`}
                            className={cn(
                              "block text-xs text-muted-foreground hover:text-primary transition-colors py-0.5"
                            )}
                          >
                            {sub.name}
                          </Link>
                        </NavigationMenuLink>
                      </li>
                    ))}
                    {category.subcategories.length > 5 && (
                      <li>
                        <Link
                          to={`/categoria/${category.slug}`}
                          className="text-xs text-primary hover:underline"
                        >
                          Ver todas...
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
};

export const CategoryMenuMobile = ({ onClose }: { onClose?: () => void }) => {
  const { categories, loading } = useCategories();

  if (loading || categories.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 py-4">
      <h3 className="font-semibold text-sm text-muted-foreground px-2">Categorias</h3>
      <div className="space-y-2">
        {categories.map((category) => (
          <div key={category.id} className="space-y-1">
            <Link
              to={`/categoria/${category.slug}`}
              onClick={onClose}
              className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium hover:bg-accent rounded-md transition-colors"
            >
              <span>{category.icon}</span>
              {category.name}
            </Link>
            <div className="pl-8 space-y-0.5">
              {category.subcategories.slice(0, 4).map((sub) => (
                <Link
                  key={sub.id}
                  to={`/categoria/${category.slug}/${sub.slug}`}
                  onClick={onClose}
                  className="block text-xs text-muted-foreground hover:text-primary py-0.5 transition-colors"
                >
                  {sub.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
