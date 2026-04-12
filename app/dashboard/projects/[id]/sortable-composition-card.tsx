"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Move, Play, MoreVertical, Pencil, Trash2, GripVertical } from "lucide-react";
import { useUpdateComposition } from "@/hooks/use-composition";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { mutate: updateComposition } = useUpdateComposition(composition.projectId);

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

  // Logic for orientation toggle (Sequence Level)
  const currentOrientation = composition.orientation || 'bottom';

  const handleToggleOrientation = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const orientations: ('bottom' | 'center' | 'top')[] = ['bottom', 'center', 'top'];
    const currentIndex = orientations.indexOf(currentOrientation as any);
    const nextIndex = (currentIndex + 1) % orientations.length;
    const nextOrientation = orientations[nextIndex];

    updateComposition({
      id: composition.id,
      orientation: nextOrientation
    });
  };

  if (!composition) return null;

  return (
    <>
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
              <div onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger render={
                        <Button variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="size-3" />
                        </Button>
                    } />
                    <DropdownMenuContent>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(composition); }}>
                        <Pencil className="mr-2 size-3.5" />
                        Edit
                    </DropdownMenuItem>
                    
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase text-muted-foreground border-t border-border/50 mt-1">
                      Set Orientation
                    </div>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleOrientation(e); }}>
                        <div className="flex items-center gap-2">
                          <Move className="size-3.5" /> 
                          Cycle Position ({currentOrientation})
                        </div>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                        className="text-destructive font-medium border-t border-border/50 mt-1" 
                        onClick={(e) => { 
                          e.stopPropagation();
                          setDeleteDialogOpen(true);
                        }}
                    >
                        <Trash2 className="mr-2 size-3.5" />
                        Delete
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-3 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase tracking-tighter opacity-50">Orientation</span>
                  <Button 
                    variant="secondary" 
                    size="xs" 
                    className="h-6 px-2 font-mono uppercase text-[9px] gap-1.5 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20"
                    onClick={handleToggleOrientation}
                  >
                    {currentOrientation === 'top' && <ArrowUp className="size-2.5" />}
                    {currentOrientation === 'center' && <Move className="size-2.5" />}
                    {currentOrientation === 'bottom' && <ArrowDown className="size-2.5" />}
                    {currentOrientation}
                  </Button>
                </div>
                <span>Index: {composition.order}</span>
              </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Sequence</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this sequence? This action cannot be undone and will permanently remove all associated media and text layers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={(e) => { e.stopPropagation(); setDeleteDialogOpen(false); }}>Cancel</Button>
            <Button variant="destructive" onClick={(e) => { e.stopPropagation(); onDelete(composition.id); setDeleteDialogOpen(false); }}>Delete Sequence</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
