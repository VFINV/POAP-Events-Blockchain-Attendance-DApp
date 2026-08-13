"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useWeb3 } from "@/context/Web3Context";
import { usePOAP, Analytics, RecentMint, EventDetails } from "@/hooks/usePOAP";
import { buildCheckInUrl } from "@/lib/checkin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarPlus,
  Send,
  Loader2,
  Lock,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Users,
  Layers,
  Clock,
  Settings2,
  Power,
  QrCode,
  Copy,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AdminDashboard() {
  const { account, isCorrectNetwork, contract } = useWeb3();
  const { createPOAPEvent, issuePOAP, getAnalytics, getRecentMints, getAllEvents, setPOAPEventActive } = usePOAP();

  // Analytics & Lists State
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentMints, setRecentMints] = useState<RecentMint[]>([]);
  const [allEvents, setAllEvents] = useState<EventDetails[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Create Event Form State
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventImageUrl, setEventImageUrl] = useState("");
  const [maxSupply, setMaxSupply] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<number | null>(null);

  // Issue Badge Form State
  const [issueEventId, setIssueEventId] = useState("");
  const [recipientAddresses, setRecipientAddresses] = useState("");
  const [isIssuingBadge, setIsIssuingBadge] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState(false);

  // Ownership state
  const [isOwner, setIsOwner] = useState<boolean | null>(null);

  // Check-in QR state
  const [checkInEvent, setCheckInEvent] = useState<EventDetails | null>(null);

  const checkInUrl = checkInEvent && typeof window !== "undefined"
    ? buildCheckInUrl(window.location.origin, checkInEvent.eventId!)
    : "";

  const qrImageUrl = checkInUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(checkInUrl)}`
    : "";

  const handleCopyCheckInUrl = async () => {
    if (!checkInUrl) return;
    await navigator.clipboard.writeText(checkInUrl);
    toast.success("Check-in link copied");
  };

  useEffect(() => {
    const checkOwnership = async () => {
      if (account && contract) {
        try {
          const ownerAddress = await contract.owner();
          const isAdmin = ownerAddress.toLowerCase() === account.toLowerCase();
          setIsOwner(isAdmin);
          
          if (isAdmin) {
            fetchData();
          }
        } catch (error) {
          console.error("Error checking ownership:", error);
          setIsOwner(false);
        }
      } else {
        setIsOwner(null);
      }
    };
    checkOwnership();
  }, [account, contract]);

  const fetchData = async () => {
    if (account && contract) {
      setIsDataLoading(true);
      try {
        const [stats, mints, events] = await Promise.all([
          getAnalytics(),
          getRecentMints(),
          getAllEvents(),
        ]);
        setAnalytics(stats);
        setRecentMints(mints);
        setAllEvents(events);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setIsDataLoading(false);
      }
    }
  };

  const handleToggleEventStatus = async (eventId: number, currentStatus: boolean) => {
    const success = await setPOAPEventActive(eventId, !currentStatus);
    if (success) {
      await fetchData();
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !maxSupply || !startTime || !endTime) return;

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      toast.error("Start time must be earlier than end time");
      return;
    }

    setIsCreatingEvent(true);
    setCreatedEventId(null);

    try {
      // Create metadata JSON and convert to Data URI for prototype
      const metadata = {
        name: eventName,
        description: eventDescription,
        image: eventImageUrl || `https://picsum.photos/seed/${encodeURIComponent(eventName)}/400/400`,
      };
      const metadataUri = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;

      const eventId = await createPOAPEvent(
        metadataUri,
        parseInt(maxSupply),
        new Date(startTime),
        new Date(endTime)
      );
      if (eventId !== null) {
        setCreatedEventId(eventId);
        await fetchData();
        // Reset form
        setEventName("");
        setEventDescription("");
        setEventImageUrl("");
        setMaxSupply("");
        setStartTime("");
        setEndTime("");
      }
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleIssueBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueEventId || !recipientAddresses) return;

    setIsIssuingBadge(true);
    setIssueSuccess(false);

    try {
      const addresses = recipientAddresses
        .split(/[\n,]/)
        .map(a => a.trim())
        .filter(a => a.length > 0);
      
      if (addresses.length === 0) return;

      const success = await issuePOAP(parseInt(issueEventId), addresses);
      if (success) {
        setIssueSuccess(true);
        await fetchData();
        // Reset form after short delay
        setTimeout(() => {
          setIssueEventId("");
          setRecipientAddresses("");
          setIssueSuccess(false);
        }, 2000);
      }
    } finally {
      setIsIssuingBadge(false);
    }
  };

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-2xl glass flex items-center justify-center">
            <Lock className="w-12 h-12 text-muted-foreground" />
          </div>
          <div className="absolute -inset-4 bg-primary/10 rounded-3xl blur-xl -z-10" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Admin Access Required</h3>
        <p className="text-muted-foreground max-w-sm">
          Connect your wallet to access the admin dashboard and manage POAP events.
        </p>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-2xl glass flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-warning" />
          </div>
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Wrong Network</h3>
        <p className="text-muted-foreground max-w-sm">
          Please switch to the correct network to access admin functions.
        </p>
      </div>
    );
  }

  if (isOwner === false) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-2xl glass flex items-center justify-center">
            <Lock className="w-12 h-12 text-destructive" />
          </div>
          <div className="absolute -inset-4 bg-destructive/10 rounded-3xl blur-xl -z-10" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Not Authorized</h3>
        <p className="text-muted-foreground max-w-sm">
          This account does not have administrative permissions for this contract.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Admin Dashboard</h2>
        <p className="text-muted-foreground">
          Manage events, issue badges, and view analytics
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass rounded-2xl p-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Total Issued</p>
            <h4 className="text-2xl font-bold text-foreground">
              {analytics?.totalIssued ?? 0}
            </h4>
          </div>
        </div>
        <div className="glass rounded-2xl p-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-chart-2/10">
            <Users className="w-6 h-6 text-chart-2" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Unique Holders</p>
            <h4 className="text-2xl font-bold text-foreground">
              {analytics?.uniqueHolders ?? 0}
            </h4>
          </div>
        </div>
        <div className="glass rounded-2xl p-6 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-chart-3/10">
            <Layers className="w-6 h-6 text-chart-3" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Total Events</p>
            <h4 className="text-2xl font-bold text-foreground">
              {analytics?.totalEvents ?? 0}
            </h4>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Event Form */}
        <div className="relative glass rounded-2xl p-6">
          <div className="absolute -inset-1 bg-primary/10 rounded-2xl blur-xl -z-10" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/20">
              <CalendarPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Create Event</h3>
              <p className="text-xs text-muted-foreground">Set up a new POAP event</p>
            </div>
          </div>

          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eventName" className="text-foreground">
                Event Name
              </Label>
              <Input
                id="eventName"
                placeholder="e.g. Community Meetup 2024"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="bg-secondary/50 border-border focus:border-primary"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventDescription" className="text-foreground">
                Description
              </Label>
              <Textarea
                id="eventDescription"
                placeholder="What is this event about?"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                className="bg-secondary/50 border-border focus:border-primary min-h-[80px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventImageUrl" className="text-foreground">
                Image URL (Optional)
              </Label>
              <Input
                id="eventImageUrl"
                placeholder="https://... (Leave blank for random)"
                value={eventImageUrl}
                onChange={(e) => setEventImageUrl(e.target.value)}
                className="bg-secondary/50 border-border focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxSupply" className="text-foreground">
                  Max Supply
                </Label>
                <Input
                  id="maxSupply"
                  type="number"
                  placeholder="100"
                  min="1"
                  value={maxSupply}
                  onChange={(e) => setMaxSupply(e.target.value)}
                  className="bg-secondary/50 border-border focus:border-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime" className="text-foreground">
                  Start Time
                </Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-secondary/50 border-border focus:border-primary text-xs"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime" className="text-foreground">
                  End Time
                </Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-secondary/50 border-border focus:border-primary text-xs"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isCreatingEvent}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isCreatingEvent ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Event...
                </>
              ) : (
                <>
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Create Event
                </>
              )}
            </Button>

            {createdEventId !== null && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span className="text-sm text-success">
                  Event created successfully! ID: {createdEventId}
                </span>
              </div>
            )}
          </form>
        </div>

        {/* Issue Badge Form */}
        <div className="relative glass rounded-2xl p-6">
          <div className="absolute -inset-1 bg-chart-2/10 rounded-2xl blur-xl -z-10" />
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-chart-2/20">
              <Send className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Issue Badge</h3>
              <p className="text-xs text-muted-foreground">Send POAPs to attendees</p>
            </div>
          </div>

          <form onSubmit={handleIssueBadge} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="issueEventId" className="text-foreground">
                Select Event
              </Label>
              <Select value={issueEventId} onValueChange={setIssueEventId}>
                <SelectTrigger className="bg-secondary/50 border-border focus:border-primary">
                  <SelectValue placeholder="Choose an event..." />
                </SelectTrigger>
                <SelectContent className="glass border-border">
                  {allEvents.filter(e => e.active).map(event => (
                    <SelectItem key={event.eventId} value={event.eventId!.toString()}>
                      #{event.eventId} - {event.metadata?.name || "Unnamed Event"}
                    </SelectItem>
                  ))}
                  {allEvents.filter(e => e.active).length === 0 && (
                    <SelectItem value="none" disabled>No active events</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipientAddresses" className="text-foreground">
                Recipient Addresses
              </Label>
              <Textarea
                id="recipientAddresses"
                placeholder="0x...&#10;0x...&#10; (One per line or comma separated)"
                value={recipientAddresses}
                onChange={(e) => setRecipientAddresses(e.target.value)}
                className="bg-secondary/50 border-border focus:border-primary font-mono text-xs min-h-[120px]"
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Enter one or more Ethereum addresses. Batch minting is supported.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isIssuingBadge || !issueEventId}
              className="w-full bg-chart-2 text-background hover:bg-chart-2/90"
            >
              {isIssuingBadge ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Issuing Badges...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Issue Badge(s)
                </>
              )}
            </Button>

            {issueSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30">
                <Sparkles className="w-4 h-4 text-success" />
                <span className="text-sm text-success">
                  Badges issued successfully!
                </span>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Recent Mints Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">Recent Mints</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Token ID
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Attendee
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Issuer
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentMints.length > 0 ? (
                recentMints.map((mint, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      #{mint.tokenId}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                      {truncateAddress(mint.attendee)}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                      {truncateAddress(mint.issuer)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                    {isDataLoading ? "Loading recent mints..." : "No recent mints found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Events Management List */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <div className="p-2 rounded-lg bg-chart-4/10">
            <Settings2 className="w-5 h-5 text-chart-4" />
          </div>
          <h3 className="font-semibold text-foreground text-lg">Manage Events</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allEvents.length > 0 ? (
            allEvents.map((event) => (
              <div key={event.eventId} className="glass rounded-xl p-4 flex gap-4">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {event.metadata?.image ? (
                    <img
                      src={event.metadata.image}
                      alt={event.metadata.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Layers className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-foreground truncate">
                      {event.metadata?.name || `Event #${event.eventId}`}
                    </h4>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => setCheckInEvent(event)}
                        title="Show check-in QR"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-6 w-6 rounded-full ${
                          event.active ? "text-success hover:text-success hover:bg-success/10" : "text-muted-foreground hover:bg-muted"
                        }`}
                        onClick={() => handleToggleEventStatus(event.eventId!, event.active)}
                        title={event.active ? "Deactivate event" : "Activate event"}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        event.active ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                      }`}>
                        {event.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                    {event.metadata?.description || "No description"}
                  </p>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {event.mintedCount} / {event.maxSupply}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(event.startTime * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 glass rounded-2xl flex flex-col items-center justify-center text-center">
              <Layers className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">
                {isDataLoading ? "Loading events..." : "No events created yet"}
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!checkInEvent} onOpenChange={(open) => !open && setCheckInEvent(null)}>
        <DialogContent className="bg-card border border-border sm:max-w-md shadow-2xl shadow-primary/5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              <span>Event Check-in QR</span>
            </DialogTitle>
          </DialogHeader>

          {checkInEvent && (
            <div className="space-y-5 py-2 text-center">
              <div>
                <h3 className="font-semibold text-foreground">
                  {checkInEvent.metadata?.name || `Event #${checkInEvent.eventId}`}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Attendees scan this QR to claim their POAP badge.
                </p>
              </div>

              <div className="mx-auto w-[280px] rounded-2xl bg-white p-3 shadow-xl">
                {qrImageUrl && (
                  <img
                    src={qrImageUrl}
                    alt={`Check-in QR for event ${checkInEvent.eventId}`}
                    className="h-[260px] w-[260px]"
                  />
                )}
              </div>

              <div className="rounded-xl bg-muted/40 border border-border/50 p-3 text-left">
                <p className="text-xs text-muted-foreground mb-1">Check-in link</p>
                <p className="break-all font-mono text-xs text-foreground">{checkInUrl}</p>
              </div>

              <Button variant="outline" className="w-full gap-2" onClick={handleCopyCheckInUrl}>
                <Copy className="w-4 h-4" />
                Copy Check-in Link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}