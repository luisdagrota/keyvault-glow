import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Key, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProductKey {
  id: string;
  key_content: string;
  is_used: boolean;
  used_at: string | null;
  order_id: string | null;
  created_at: string;
}

interface SellerProductKeysProps {
  productId: string;
  productName: string;
  onClose: () => void;
  onKeysUpdated: () => void;
}

export const SellerProductKeys = ({ 
  productId, 
  productName, 
  onClose,
  onKeysUpdated 
}: SellerProductKeysProps) => {
  const [keys, setKeys] = useState<ProductKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newKeys, setNewKeys] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchKeys();
  }, [productId]);

  const fetchKeys = async () => {
    const { data, error } = await supabase
      .from("seller_product_keys")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching keys:", error);
      toast({ title: "Erro ao carregar chaves", variant: "destructive" });
      return;
    }

    setKeys(data || []);
    setLoading(false);
  };

  const addKeys = async () => {
    const keyLines = newKeys
      .split("\n")
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keyLines.length === 0) {
      toast({ title: "Insira pelo menos uma chave", variant: "destructive" });
      return;
    }

    setSaving(true);

    const keysToInsert = keyLines.map(key => ({
      product_id: productId,
      key_content: key,
    }));

    const { error } = await supabase
      .from("seller_product_keys")
      .insert(keysToInsert);

    if (error) {
      toast({ title: "Erro ao adicionar chaves", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${keyLines.length} chave(s) adicionada(s)!` });
      setNewKeys("");
      setAddDialogOpen(false);
      fetchKeys();
      
      // Update product stock count
      await updateProductStock();
      onKeysUpdated();
    }

    setSaving(false);
  };

  const deleteKey = async (keyId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta chave?")) return;

    const { error } = await supabase
      .from("seller_product_keys")
      .delete()
      .eq("id", keyId);

    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Chave excluída!" });
      fetchKeys();
      await updateProductStock();
      onKeysUpdated();
    }
  };

  const updateProductStock = async () => {
    // Count available keys and update product stock
    const { count } = await supabase
      .from("seller_product_keys")
      .select("*", { count: "exact", head: true })
      .eq("product_id", productId)
      .eq("is_used", false);

    await supabase
      .from("seller_products")
      .update({ stock: count || 0 })
      .eq("id", productId);
  };

  const availableKeys = keys.filter(k => !k.is_used);
  const usedKeys = keys.filter(k => k.is_used);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Key className="h-5 w-5" />
            Chaves de "{productName}"
          </h3>
          <p className="text-sm text-muted-foreground">
            {availableKeys.length} disponível(is) · {usedKeys.length} utilizada(s)
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Chaves
        </Button>
      </div>

      {keys.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma chave cadastrada. Adicione chaves para entrega automática.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chave/Código</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Adicionada</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-mono text-sm max-w-[300px] truncate">
                      {key.is_used ? "••••••••••••••••" : key.key_content}
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.is_used ? "secondary" : "default"}>
                        {key.is_used ? "Utilizada" : "Disponível"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(key.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                      {key.is_used && key.used_at && (
                        <div className="text-xs">
                          Usada {formatDistanceToNow(new Date(key.used_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {!key.is_used && (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => deleteKey(key.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Keys Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Chaves</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Insira as chaves/códigos, uma por linha. Cada linha será uma chave separada.
            </p>
            <div className="space-y-2">
              <Label htmlFor="newKeys">Chaves</Label>
              <Textarea
                id="newKeys"
                value={newKeys}
                onChange={(e) => setNewKeys(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX&#10;YYYY-YYYY-YYYY-YYYY&#10;ZZZZ-ZZZZ-ZZZZ-ZZZZ"
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {newKeys.split("\n").filter(k => k.trim().length > 0).length} chave(s) para adicionar
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={addKeys} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};