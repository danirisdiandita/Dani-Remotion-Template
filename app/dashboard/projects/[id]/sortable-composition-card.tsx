"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, MoreVertical, Pencil, Trash2, GripVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SortableCompositionCardProps {
  composition: any;
  onEdit: (comp: any) => void;
  onDelete: (id: string) => void;
  onClick?: () => void;
}

export function SortableCompositionCard({ 
    composition, 
    onEdit, 
    onDelete,
    onClick
}: SortableCompositionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: composition.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="touch-none shrink-0 group">
      <Card 
        onClick={onClick}
        className="w-[280px] overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-200 cursor-pointer active:scale-[0.98]"
      >
        <div className="aspect-video bg-muted/50 relative flex items-center justify-center">
            {/* Grip handle for DnD */}
            <div 
              {...attributes} 
              {...listeners} 
              className="absolute top-2 left-2 p-1 rounded-md bg-background/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing border border-border"
            >
              <GripVertical className="size-4 text-muted-foreground" />
            </div>

            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Button 
                size="icon" 
                variant="secondary" 
                className="rounded-full scale-0 group-hover:scale-100 transition-all duration-200 shadow-xl"
                >
                <Play className="size-5 fill-current" />
                </Button>
            </div>
            <Play className="size-8 text-muted-foreground/20 group-hover:hidden transition-all" />
        </div>
        <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1 gap-2">
            <h3 className="font-semibold truncate text-sm flex-1">{composition.name || `Sequence #${composition.order}`}</h3>
            <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 transition-opacity" />}>
                    <MoreVertical className="size-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onEdit(composition)}>
                    <Pencil className="mr-2 size-3.5" />
                    Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                    className="text-destructive font-medium" 
                    onClick={() => { if(confirm("Delete this composition?")) onDelete(composition.id); }}
                >
                    <Trash2 className="mr-2 size-3.5" />
                    Delete
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Index: {composition.order}</span>
            <span>{new Date(composition.updatedAt).toLocaleDateString()}</span>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
