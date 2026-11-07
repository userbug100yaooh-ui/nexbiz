import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useImportMutation } from "@/lib/queries";
import { cn } from "@/lib/utils";

const TEMPLATES = {
  products: {
    label: "produtos",
    columns: "Nome, SKU, Categoria, Preço, Custo, Estoque, Estoque mínimo",
    csv: "Nome;SKU;Categoria;Preço;Custo;Estoque;Estoque mínimo\nCaneta Esferográfica Azul;CAN-AZ;Escritório;2,50;0,90;200;50\nGrampeador Metálico;GRA-01;Escritório;34,90;18,00;15;5\n",
  },
  clients: {
    label: "clientes",
    columns: "Nome, Tipo (PF/PJ), CPF/CNPJ, E-mail, Telefone, Cidade, UF",
    csv: "Nome;Tipo;CPF/CNPJ;E-mail;Telefone;Cidade;UF\nMercado Bom Preço LTDA;PJ;11.222.333/0001-44;compras@bompreco.com.br;(11) 3333-4444;São Paulo;SP\nCarla Mendes;PF;123.456.789-00;carla@email.com;(11) 98888-7777;Campinas;SP\n",
  },
} as const;

/** Importação de planilha CSV/XLSX reutilizável (Produtos e Clientes). */
export function ImportDialog({ entity }: { entity: "products" | "clients" }) {
  const tpl = TEMPLATES[entity];
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const mutation = useImportMutation(entity);

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob(["\uFEFF" + tpl.csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `modelo-${tpl.label}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submit = () => {
    if (!file) return;
    mutation.mutate(file, {
      onSuccess: () => {
        setOpen(false);
        setFile(null);
      },
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setFile(null);
      }}
    >
      <DialogTrigger render={<Button variant="outline" data-testid={`btn-importar-${entity}`} />}>
        <Upload className="size-4" /> Importar planilha
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" data-testid={`dialog-importar-${entity}`}>
        <DialogHeader>
          <DialogTitle>Importar {tpl.label}</DialogTitle>
          <DialogDescription>Envie um arquivo CSV ou XLSX. Colunas reconhecidas: {tpl.columns}.</DialogDescription>
        </DialogHeader>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) setFile(f);
          }}
          className={cn(
            "flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/40",
          )}
          data-testid={`dropzone-importar-${entity}`}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileSpreadsheet className="size-5" />
          </span>
          {file ? (
            <>
              <span className="text-sm font-semibold" data-testid={`arquivo-selecionado-${entity}`}>{file.name}</span>
              <span className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · clique para trocar</span>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold">Arraste o arquivo aqui ou clique para escolher</span>
              <span className="text-xs text-muted-foreground">.csv, .xlsx — valores em formato brasileiro (1.234,56) são aceitos</span>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          data-testid={`input-arquivo-${entity}`}
        />

        <button type="button" onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline" data-testid={`btn-modelo-${entity}`}>
          <Download className="size-3.5" /> Baixar planilha modelo
        </button>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} data-testid={`btn-cancelar-importar-${entity}`}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!file || mutation.isPending} data-testid={`btn-confirmar-importar-${entity}`}>
            {mutation.isPending ? "Importando…" : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
