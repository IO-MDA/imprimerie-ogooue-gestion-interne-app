import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, FileText, MessageSquare, Loader2, X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { debounce } from '@/components/utils/performanceMonitor';

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({
    employes: [],
    documents: [],
    conversations: []
  });
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults({ employes: [], documents: [], conversations: [] });
    }
  }, [open]);

  useEffect(() => {
    if (query.length >= 2) {
      debouncedSearch(query);
    } else {
      setResults({ employes: [], documents: [], conversations: [] });
    }
  }, [query]);

  const performSearch = async (searchQuery) => {
    setIsSearching(true);
    try {
      const searchLower = searchQuery.toLowerCase();

      // Search users/employees
      const users = await base44.entities.User.list();
      const employes = users.filter(u => 
        u.full_name?.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower) ||
        u.departement?.toLowerCase().includes(searchLower) ||
        u.poste?.toLowerCase().includes(searchLower)
      ).slice(0, 5);

      // Search HR documents (DemandesRH, ModeleDocumentRH)
      const [demandesRH, modeles] = await Promise.all([
        base44.entities.DemandeRH.list('-created_date', 100),
        base44.entities.ModeleDocumentRH.list()
      ]);

      const documentsRH = [
        ...demandesRH.filter(d =>
          d.titre?.toLowerCase().includes(searchLower) ||
          d.description?.toLowerCase().includes(searchLower)
        ).map(d => ({ ...d, type: 'demande_rh' })),
        ...modeles.filter(m =>
          m.nom?.toLowerCase().includes(searchLower) ||
          m.description?.toLowerCase().includes(searchLower)
        ).map(m => ({ ...m, type: 'modele' }))
      ].slice(0, 5);

      // Search chat conversations
      const conversations = await base44.entities.ChatConversation.list('-dernier_message_date', 100);
      const conversationsFiltered = conversations.filter(c =>
        c.nom?.toLowerCase().includes(searchLower) ||
        c.dernier_message?.toLowerCase().includes(searchLower) ||
        c.participants?.some(p => p.nom?.toLowerCase().includes(searchLower))
      ).slice(0, 5);

      setResults({
        employes,
        documents: documentsRH,
        conversations: conversationsFiltered
      });
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const debouncedSearch = debounce(performSearch, 300);

  const handleResultClick = (type, item) => {
    if (type === 'employe') {
      window.location.href = createPageUrl('Employes');
    } else if (type === 'document') {
      if (item.type === 'demande_rh') {
        window.location.href = createPageUrl('DemandesRH');
      } else {
        window.location.href = createPageUrl('ModelesDocuments');
      }
    } else if (type === 'conversation') {
      window.location.href = createPageUrl('Chat');
    }
    onClose();
  };

  const totalResults = results.employes.length + results.documents.length + results.conversations.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] p-0 gap-0">
        <div className="sticky top-0 bg-white border-b p-4 z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Rechercher employés, documents, conversations..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10 text-base h-12"
              autoFocus
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600 animate-spin" />
            )}
            {query && !isSearching && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {query.length >= 2 && (
            <p className="text-xs text-slate-500 mt-2">
              {totalResults} résultat{totalResults > 1 ? 's' : ''} trouvé{totalResults > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="overflow-y-auto p-4 space-y-6 max-h-[calc(80vh-120px)]">
          {query.length < 2 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Tapez au moins 2 caractères pour rechercher</p>
            </div>
          )}

          {query.length >= 2 && totalResults === 0 && !isSearching && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aucun résultat trouvé</p>
            </div>
          )}

          {/* Employés */}
          {results.employes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-slate-900">Employés</h3>
                <Badge variant="secondary">{results.employes.length}</Badge>
              </div>
              <div className="space-y-2">
                {results.employes.map(emp => (
                  <button
                    key={emp.id}
                    onClick={() => handleResultClick('employe', emp)}
                    className="w-full p-3 bg-slate-50 hover:bg-blue-50 rounded-lg text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {emp.full_name?.[0]?.toUpperCase() || emp.email?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {emp.full_name || emp.email}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {emp.poste || emp.departement || emp.email}
                        </p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-700">
                        {emp.role}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Documents RH */}
          {results.documents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-slate-900">Documents RH</h3>
                <Badge variant="secondary">{results.documents.length}</Badge>
              </div>
              <div className="space-y-2">
                {results.documents.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => handleResultClick('document', doc)}
                    className="w-full p-3 bg-slate-50 hover:bg-emerald-50 rounded-lg text-left transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {doc.titre || doc.nom}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {doc.description || doc.type_document}
                        </p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {doc.type === 'demande_rh' ? 'Demande RH' : 'Modèle'}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversations */}
          {results.conversations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                <h3 className="font-semibold text-slate-900">Conversations</h3>
                <Badge variant="secondary">{results.conversations.length}</Badge>
              </div>
              <div className="space-y-2">
                {results.conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => handleResultClick('conversation', conv)}
                    className="w-full p-3 bg-slate-50 hover:bg-purple-50 rounded-lg text-left transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <MessageSquare className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {conv.nom || conv.participants?.map(p => p.nom).join(', ')}
                        </p>
                        {conv.dernier_message && (
                          <p className="text-sm text-slate-500 truncate">
                            {conv.dernier_message}
                          </p>
                        )}
                        <Badge variant="outline" className="mt-1 text-xs">
                          {conv.type === 'groupe' ? 'Groupe' : 'Privée'}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}