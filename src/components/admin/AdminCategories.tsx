import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  display_order: number;
  is_active: boolean;
}

interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  display_order: number;
  is_active: boolean;
}

export const AdminCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  
  // Category form state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", icon: "📦" });
  
  // Subcategory form state
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [subcategoryForm, setSubcategoryForm] = useState({ name: "", category_id: "" });

  const fetchData = async () => {
    setLoading(true);
    
    const [{ data: cats }, { data: subs }] = await Promise.all([
      supabase.from("categories").select("*").order("display_order"),
      supabase.from("subcategories").select("*").order("display_order")
    ]);
    
    setCategories(cats || []);
    setSubcategories(subs || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    const slug = generateSlug(categoryForm.name);

    if (editingCategory) {
      const { error } = await supabase
        .from("categories")
        .update({ name: categoryForm.name, icon: categoryForm.icon, slug })
        .eq("id", editingCategory.id);

      if (error) {
        toast.error("Erro ao atualizar categoria");
        return;
      }
      toast.success("Categoria atualizada!");
    } else {
      const maxOrder = Math.max(...categories.map(c => c.display_order), 0);
      const { error } = await supabase
        .from("categories")
        .insert({ 
          name: categoryForm.name, 
          icon: categoryForm.icon, 
          slug,
          display_order: maxOrder + 1 
        });

      if (error) {
        toast.error("Erro ao criar categoria");
        return;
      }
      toast.success("Categoria criada!");
    }

    setCategoryDialogOpen(false);
    setEditingCategory(null);
    setCategoryForm({ name: "", icon: "📦" });
    fetchData();
  };

  const handleSaveSubcategory = async () => {
    if (!subcategoryForm.name.trim() || !subcategoryForm.category_id) {
      toast.error("Nome e categoria são obrigatórios");
      return;
    }

    const slug = generateSlug(subcategoryForm.name);
    const categorySubs = subcategories.filter(s => s.category_id === subcategoryForm.category_id);
    const maxOrder = Math.max(...categorySubs.map(s => s.display_order), 0);

    if (editingSubcategory) {
      const { error } = await supabase
        .from("subcategories")
        .update({ name: subcategoryForm.name, slug, category_id: subcategoryForm.category_id })
        .eq("id", editingSubcategory.id);

      if (error) {
        toast.error("Erro ao atualizar subcategoria");
        return;
      }
      toast.success("Subcategoria atualizada!");
    } else {
      const { error } = await supabase
        .from("subcategories")
        .insert({ 
          name: subcategoryForm.name, 
          slug,
          category_id: subcategoryForm.category_id,
          display_order: maxOrder + 1 
        });

      if (error) {
        toast.error("Erro ao criar subcategoria");
        return;
      }
      toast.success("Subcategoria criada!");
    }

    setSubcategoryDialogOpen(false);
    setEditingSubcategory(null);
    setSubcategoryForm({ name: "", category_id: "" });
    fetchData();
  };

  const toggleCategoryActive = async (category: Category) => {
    const { error } = await supabase
      .from("categories")
      .update({ is_active: !category.is_active })
      .eq("id", category.id);

    if (error) {
      toast.error("Erro ao atualizar categoria");
      return;
    }
    toast.success(category.is_active ? "Categoria desativada" : "Categoria ativada");
    fetchData();
  };

  const toggleSubcategoryActive = async (subcategory: Subcategory) => {
    const { error } = await supabase
      .from("subcategories")
      .update({ is_active: !subcategory.is_active })
      .eq("id", subcategory.id);

    if (error) {
      toast.error("Erro ao atualizar subcategoria");
      return;
    }
    toast.success(subcategory.is_active ? "Subcategoria desativada" : "Subcategoria ativada");
    fetchData();
  };

  const deleteSubcategory = async (id: string) => {
    const { error } = await supabase.from("subcategories").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir subcategoria");
      return;
    }
    toast.success("Subcategoria excluída!");
    fetchData();
  };

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Categorias</h2>
          <p className="text-muted-foreground text-sm">Gerencie as categorias e subcategorias do site</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={subcategoryDialogOpen} onOpenChange={setSubcategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => {
                setEditingSubcategory(null);
                setSubcategoryForm({ name: "", category_id: categories[0]?.id || "" });
              }}>
                <Plus className="h-4 w-4 mr-1" />
                Nova Subcategoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSubcategory ? "Editar Subcategoria" : "Nova Subcategoria"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Categoria</Label>
                  <select
                    className="w-full mt-1 p-2 border rounded-md bg-background"
                    value={subcategoryForm.category_id}
                    onChange={(e) => setSubcategoryForm(prev => ({ ...prev, category_id: e.target.value }))}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={subcategoryForm.name}
                    onChange={(e) => setSubcategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Steam"
                  />
                </div>
                <Button onClick={handleSaveSubcategory} className="w-full">
                  {editingSubcategory ? "Salvar" : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: "", icon: "📦" });
              }}>
                <Plus className="h-4 w-4 mr-1" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Ícone (emoji)</Label>
                  <Input
                    value={categoryForm.icon}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="🎮"
                  />
                </div>
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Jogos"
                  />
                </div>
                <Button onClick={handleSaveCategory} className="w-full">
                  {editingCategory ? "Salvar" : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-3">
        {categories.map((category) => {
          const categorySubs = subcategories.filter(s => s.category_id === category.id);
          const isExpanded = expandedCategories.includes(category.id);

          return (
            <Card key={category.id} className={!category.is_active ? "opacity-60" : ""}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(category.id)}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger className="flex items-center gap-3 hover:text-primary transition-colors">
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <span className="text-xl">{category.icon}</span>
                      <CardTitle className="text-base">{category.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {categorySubs.length} subcategorias
                      </Badge>
                      {!category.is_active && <Badge variant="destructive">Inativo</Badge>}
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={() => toggleCategoryActive(category)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingCategory(category);
                          setCategoryForm({ name: category.name, icon: category.icon });
                          setCategoryDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="border-t pt-3 space-y-2">
                      {categorySubs.map((sub) => (
                        <div
                          key={sub.id}
                          className={`flex items-center justify-between p-2 rounded-md bg-muted/50 ${!sub.is_active ? "opacity-60" : ""}`}
                        >
                          <div className="flex items-center gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{sub.name}</span>
                            {!sub.is_active && <Badge variant="destructive" className="text-xs">Inativo</Badge>}
                          </div>
                          <div className="flex items-center gap-1">
                            <Switch
                              checked={sub.is_active}
                              onCheckedChange={() => toggleSubcategoryActive(sub)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingSubcategory(sub);
                                setSubcategoryForm({ name: sub.name, category_id: sub.category_id });
                                setSubcategoryDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir subcategoria?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Produtos nesta subcategoria perderão a referência.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteSubcategory(sub.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))}
                      {categorySubs.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Nenhuma subcategoria
                        </p>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
