import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Package, 
  FileText, 
  Receipt,
  MessageSquare,
  AlertCircle,
  X
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import moment from 'moment';
import { cn } from '@/lib/utils';

export default function NotificationCenter({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadNotifications();
      // Rafraîchir toutes les 30 secondes
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const data = await base44.entities.Notification.filter(
        { destinataire_id: user.id },
        '-created_date',
        50
      );
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.lu).length);
    } catch (e) {
      console.error('Erreur chargement notifications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await base44.entities.Notification.update(notificationId, {
        lu: true,
        date_lecture: new Date().toISOString()
      });
      loadNotifications();
    } catch (e) {
      console.error('Erreur marquage lu:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.lu);
      await Promise.all(
        unread.map(n => 
          base44.entities.Notification.update(n.id, {
            lu: true,
            date_lecture: new Date().toISOString()
          })
        )
      );
      toast.success('Toutes les notifications marquées comme lues');
      loadNotifications();
    } catch (e) {
      toast.error('Erreur lors du marquage');
    }
  };

  const deleteNotification = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await base44.entities.Notification.delete(notificationId);
      toast.success('Notification supprimée');
      loadNotifications();
    } catch (e) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getIcon = (type) => {
    const icons = {
      'commande': Package,
      'facture': Receipt,
      'demande': FileText,
      'devis': FileText,
      'message': MessageSquare,
      'systeme': AlertCircle
    };
    return icons[type] || Bell;
  };

  const getPriorityColor = (priorite) => {
    const colors = {
      'urgente': 'text-red-600 bg-red-50',
      'haute': 'text-orange-600 bg-orange-50',
      'normale': 'text-blue-600 bg-blue-50',
      'basse': 'text-slate-600 bg-slate-50'
    };
    return colors[priorite] || colors['normale'];
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative hover:bg-slate-100"
        >
          <Bell className="w-5 h-5 text-slate-600" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        className="w-[90vw] md:w-96 p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h3 className="font-bold text-slate-900">Notifications</h3>
            <p className="text-xs text-slate-500">
              {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Aucune nouvelle notification'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Tout lire
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => {
                const Icon = getIcon(notification.type);
                const isUnread = !notification.lu;

                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "p-4 hover:bg-slate-50 transition-colors cursor-pointer relative",
                      isUnread && "bg-blue-50/50"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                        getPriorityColor(notification.priorite)
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={cn(
                            "text-sm line-clamp-1",
                            isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                          )}>
                            {notification.titre}
                          </h4>
                          <button
                            onClick={(e) => deleteNotification(notification.id, e)}
                            className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                          {notification.message}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-400">
                            {moment(notification.created_date).fromNow()}
                          </span>
                          {notification.priorite === 'urgente' && (
                            <Badge className="bg-red-100 text-red-700 text-xs">
                              Urgent
                            </Badge>
                          )}
                          {notification.priorite === 'haute' && (
                            <Badge className="bg-orange-100 text-orange-700 text-xs">
                              Important
                            </Badge>
                          )}
                        </div>
                      </div>

                      {isUnread && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t bg-slate-50 text-center">
            <p className="text-xs text-slate-500">
              Vous avez {notifications.length} notification{notifications.length > 1 ? 's' : ''}
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}