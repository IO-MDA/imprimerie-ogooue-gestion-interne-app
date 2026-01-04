import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Calendar, User, Clock, AlertCircle, Eye } from 'lucide-react';
import moment from 'moment';

export default function KanbanBoard({ taches, onStatusChange, onTaskClick, getPriorityIcon, getUrgenceColor }) {
  const columns = [
    { id: 'en_attente', title: 'À faire', color: 'slate' },
    { id: 'en_cours', title: 'En cours', color: 'blue' },
    { id: 'terminee', title: 'Terminée', color: 'emerald' },
    { id: 'validee', title: 'Validée', color: 'purple' }
  ];

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    
    if (source.droppableId !== destination.droppableId) {
      const newStatut = destination.droppableId;
      onStatusChange(draggableId, newStatut);
    }
  };

  const getTachesForColumn = (columnId) => {
    return taches.filter(t => t.statut === columnId).sort((a, b) => (a.ordre_kanban || 0) - (b.ordre_kanban || 0));
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map(column => {
          const columnTaches = getTachesForColumn(column.id);
          
          return (
            <div key={column.id} className="space-y-3">
              <div className={`p-3 rounded-lg bg-${column.color}-50 border-2 border-${column.color}-200`}>
                <div className="flex items-center justify-between">
                  <h3 className={`font-semibold text-${column.color}-900`}>{column.title}</h3>
                  <Badge className={`bg-${column.color}-100 text-${column.color}-700`}>
                    {columnTaches.length}
                  </Badge>
                </div>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`space-y-3 min-h-[500px] p-2 rounded-lg transition-colors ${
                      snapshot.isDraggingOver ? 'bg-blue-50' : 'bg-slate-50'
                    }`}
                  >
                    {columnTaches.map((tache, index) => {
                      const urgenceColor = getUrgenceColor(tache.date_echeance, tache.statut);
                      const colorMap = {
                        rose: 'border-rose-500',
                        amber: 'border-amber-500',
                        yellow: 'border-yellow-500',
                        blue: 'border-blue-500',
                        emerald: 'border-emerald-500'
                      };

                      return (
                        <Draggable key={tache.id} draggableId={tache.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`border-0 shadow-md hover:shadow-lg transition-all cursor-pointer ${
                                snapshot.isDragging ? 'opacity-70 rotate-3' : ''
                              } border-l-4 ${colorMap[urgenceColor] || 'border-slate-300'}`}
                              onClick={() => onTaskClick(tache)}
                            >
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="font-semibold text-slate-900 line-clamp-2 text-sm">
                                    {getPriorityIcon(tache.priorite)} {tache.titre}
                                  </h4>
                                </div>

                                {tache.description && (
                                  <p className="text-xs text-slate-600 line-clamp-2">{tache.description}</p>
                                )}

                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <User className="w-3 h-3" />
                                    <span className="truncate">{tache.assigne_a_nom}</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <Calendar className="w-3 h-3" />
                                    <span>{moment(tache.date_echeance).format('DD/MM')}</span>
                                    {moment(tache.date_echeance).isBefore(moment(), 'day') && tache.statut !== 'terminee' && tache.statut !== 'validee' && (
                                      <AlertCircle className="w-3 h-3 text-rose-500" />
                                    )}
                                  </div>
                                </div>

                                {tache.sous_taches && tache.sous_taches.length > 0 && (
                                  <div className="flex items-center gap-2 text-xs">
                                    <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className="bg-emerald-500 h-full transition-all"
                                        style={{ 
                                          width: `${(tache.sous_taches.filter(st => st.statut === 'terminee').length / tache.sous_taches.length) * 100}%` 
                                        }}
                                      />
                                    </div>
                                    <span className="text-slate-600">
                                      {tache.sous_taches.filter(st => st.statut === 'terminee').length}/{tache.sous_taches.length}
                                    </span>
                                  </div>
                                )}

                                {tache.commentaires && tache.commentaires.length > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    💬 {tache.commentaires.length}
                                  </Badge>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                    
                    {columnTaches.length === 0 && (
                      <div className="text-center py-8 text-slate-400 text-sm">
                        Glissez une tâche ici
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}