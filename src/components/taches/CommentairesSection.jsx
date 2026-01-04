import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import moment from 'moment';

export default function CommentairesSection({ tache, user, onUpdate }) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Le commentaire ne peut pas être vide');
      return;
    }

    setIsSubmitting(true);
    
    const updatedCommentaires = [
      ...(tache.commentaires || []),
      {
        auteur: user.email,
        auteur_nom: user.full_name || user.email,
        contenu: newComment,
        date: new Date().toISOString()
      }
    ];

    await onUpdate({ commentaires: updatedCommentaires });
    setNewComment('');
    setIsSubmitting(false);
    toast.success('Commentaire ajouté');
  };

  const commentaires = tache.commentaires || [];

  return (
    <Card className="border-0 bg-slate-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Commentaires ({commentaires.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add comment */}
        <div className="space-y-2">
          <Textarea
            placeholder="Ajouter un commentaire..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="bg-white"
          />
          <Button
            onClick={handleAddComment}
            disabled={isSubmitting || !newComment.trim()}
            className="bg-blue-600"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Envoi...' : 'Commenter'}
          </Button>
        </div>

        {/* Comments list */}
        {commentaires.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            Aucun commentaire pour le moment
          </p>
        ) : (
          <div className="space-y-3">
            {commentaires.map((comment, idx) => (
              <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm text-slate-900">
                    {comment.auteur_nom}
                  </p>
                  <p className="text-xs text-slate-500">
                    {moment(comment.date).format('DD/MM/YYYY HH:mm')}
                  </p>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {comment.contenu}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}