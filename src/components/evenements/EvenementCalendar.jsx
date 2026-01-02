import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, PartyPopper, Bell } from 'lucide-react';
import moment from 'moment';

export default function EvenementCalendar({ evenements, onSelectEvent, onAddEvent }) {
  const today = moment();
  const startOfMonth = today.clone().startOf('month');
  const endOfMonth = today.clone().endOf('month');
  const startDate = startOfMonth.clone().startOf('week');
  const endDate = endOfMonth.clone().endOf('week');

  const calendar = [];
  let day = startDate.clone();

  while (day.isSameOrBefore(endDate)) {
    calendar.push({
      date: day.clone(),
      isCurrentMonth: day.month() === today.month(),
      isToday: day.isSame(today, 'day'),
      events: evenements.filter(e => moment(e.date).isSame(day, 'day'))
    });
    day.add(1, 'day');
  }

  const weeks = [];
  for (let i = 0; i < calendar.length; i += 7) {
    weeks.push(calendar.slice(i, i + 7));
  }

  const getEventColor = (type) => {
    const colors = {
      fete_nationale: 'bg-blue-500',
      fete_religieuse: 'bg-purple-500',
      rentree_scolaire: 'bg-amber-500',
      commercial: 'bg-emerald-500',
      culturel: 'bg-violet-500',
      autre: 'bg-slate-500'
    };
    return colors[type] || colors.autre;
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            {today.format('MMMM YYYY')}
          </CardTitle>
          <Button onClick={onAddEvent} size="sm" className="bg-blue-600 hover:bg-blue-700">
            Ajouter événement
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
              {day}
            </div>
          ))}
          
          {weeks.map((week, weekIdx) => (
            <React.Fragment key={weekIdx}>
              {week.map((dayData, dayIdx) => {
                const upcomingEvent = dayData.events.find(e => moment(e.date).isAfter(moment()));
                const isUrgent = upcomingEvent && moment(upcomingEvent.date).diff(moment(), 'days') <= 7;
                
                return (
                  <div
                    key={dayIdx}
                    className={`
                      min-h-[80px] p-1 border rounded-lg transition-all cursor-pointer
                      ${dayData.isCurrentMonth ? 'bg-white' : 'bg-slate-50'}
                      ${dayData.isToday ? 'border-blue-500 border-2' : 'border-slate-200'}
                      ${dayData.events.length > 0 ? 'hover:shadow-md' : ''}
                      ${isUrgent ? 'border-amber-300 bg-amber-50' : ''}
                    `}
                    onClick={() => dayData.events.length > 0 && onSelectEvent(dayData.events[0])}
                  >
                    <div className={`text-xs font-medium mb-1 ${
                      dayData.isToday ? 'text-blue-600' : 
                      dayData.isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
                    }`}>
                      {dayData.date.date()}
                    </div>
                    
                    {dayData.events.map((event, idx) => (
                      <div key={idx} className="mb-1">
                        <div className={`text-[10px] px-1 py-0.5 rounded text-white truncate ${getEventColor(event.type)}`}>
                          {isUrgent && <Bell className="w-2 h-2 inline mr-0.5" />}
                          {event.nom}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge className="bg-blue-500">Fête nationale</Badge>
          <Badge className="bg-purple-500">Fête religieuse</Badge>
          <Badge className="bg-amber-500">Rentrée scolaire</Badge>
          <Badge className="bg-emerald-500">Commercial</Badge>
          <Badge className="bg-violet-500">Culturel</Badge>
        </div>
      </CardContent>
    </Card>
  );
}