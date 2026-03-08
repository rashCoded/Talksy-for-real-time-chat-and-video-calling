import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { toast } from 'sonner';
import { UserPlus, Check, X, Search } from 'lucide-react';

interface User {
  id: number;
  username: string;
  email: string;
  avatarUrl: string;
  online: boolean;
  lastSeen: string;
}

interface FriendRequest {
  id: number;
  sender: User;
  receiver: User;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED';
  createdAt: string;
  updatedAt: string;
}

export function FriendRequestsManager() {
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const receivedResponse = await fetch('http://localhost:8080/api/friends/requests/received', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (receivedResponse.ok) {
        setReceivedRequests(await receivedResponse.json());
      }

      const sentResponse = await fetch('http://localhost:8080/api/friends/requests/sent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (sentResponse.ok) {
        setSentRequests(await sentResponse.json());
      }
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8080/api/users/search?query=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const users = await response.json();
        setSearchResults(users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (user: User) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:8080/api/friends/send-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ receiverEmail: user.email })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Friend request sent!');
        loadRequests();
        setSearchResults(prev => prev.filter(u => u.id !== user.id));
      } else {
        toast.error(data.message || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Network error - check if backend is running');
    }
  };

  const handleRequest = async (requestId: number, action: 'accept' | 'decline') => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:8080/api/friends/${action}/${requestId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success(`Friend request ${action}ed!`);
        loadRequests();
      }
    } catch (error) {
      console.error(`Error ${action}ing friend request:`, error);
    }
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <ScrollArea className="flex-1 w-full h-full" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Search Users */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                Find Friends
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Search for users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Input
                  placeholder="Search by username or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                  }}
                  className="text-sm"
                />
                {loading && <p className="text-xs text-muted-foreground">Searching...</p>}
                <div className="space-y-2 max-h-[200px] sm:max-h-[300px] overflow-y-auto">
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                          <AvatarImage src={user.avatarUrl} />
                          <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{user.username}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      <Button onClick={() => sendFriendRequest(user)} size="sm" className="text-xs">
                        <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Received Requests */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Friend Requests</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Pending requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[200px] sm:max-h-[300px] overflow-y-auto">
                {receivedRequests.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No requests</p>
                ) : (
                  receivedRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                          <AvatarImage src={request.sender.avatarUrl} />
                          <AvatarFallback>{request.sender.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{request.sender.username}</p>
                          <p className="text-xs text-muted-foreground truncate">{request.sender.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button onClick={() => handleRequest(request.id, 'accept')} size="sm" className="h-8 px-2">
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button onClick={() => handleRequest(request.id, 'decline')} size="sm" variant="outline" className="h-8 px-2">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sent Requests */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg">Sent Requests</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Requests you sent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[200px] sm:max-h-[300px] overflow-y-auto">
                {sentRequests.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No sent requests</p>
                ) : (
                  sentRequests.map((request) => (
                    <div key={request.id} className="flex items-center gap-2 p-2 sm:p-3 border rounded-lg">
                      <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                        <AvatarImage src={request.receiver.avatarUrl} />
                        <AvatarFallback>{request.receiver.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{request.receiver.username}</p>
                        <Badge variant="outline" className="text-[10px]">Pending</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="h-4" />
        </div>
      </ScrollArea>
    </div>
  );
}