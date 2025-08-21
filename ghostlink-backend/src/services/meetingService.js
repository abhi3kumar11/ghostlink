const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

class MeetingService {
  constructor() {
    this.meetings = new Map(); // meetingId -> meeting data
    this.activeSessions = new Map(); // sessionId -> meeting session data
    this.participants = new Map(); // socketId -> participant data
  }

  // Create a new scheduled meeting
  createMeeting(anonId, meetingData) {
    const meetingId = uuidv4().substring(0, 8).toUpperCase();
    const passcode = this.generatePasscode();
    
    const meeting = {
      id: meetingId,
      title: meetingData.title || 'Anonymous Meeting',
      createdBy: anonId,
      createdAt: Date.now(),
      scheduledFor: meetingData.scheduledFor || Date.now(),
      duration: meetingData.duration || 3600000, // 1 hour default
      passcode: passcode,
      maxParticipants: meetingData.maxParticipants || 10,
      isActive: false,
      participants: new Set(),
      settings: {
        allowScreenShare: meetingData.allowScreenShare !== false,
        allowChat: meetingData.allowChat !== false,
        allowRecording: false, // Always false for privacy
        requirePasscode: meetingData.requirePasscode !== false,
        autoDelete: meetingData.autoDelete !== false
      },
      metadata: {
        participantCount: 0,
        startedAt: null,
        endedAt: null,
        totalDuration: 0
      }
    };

    this.meetings.set(meetingId, meeting);
    
    console.log(`📅 Meeting created: ${meetingId} by ${anonId}`);
    
    return {
      success: true,
      meetingId,
      passcode,
      meeting: this.sanitizeMeeting(meeting)
    };
  }

  // Join a meeting with passcode
  joinMeeting(socketId, anonId, meetingId, passcode) {
    const meeting = this.meetings.get(meetingId);
    
    if (!meeting) {
      return { success: false, error: 'Meeting not found' };
    }

    // Check if meeting has expired
    if (this.isMeetingExpired(meeting)) {
      this.meetings.delete(meetingId);
      return { success: false, error: 'Meeting has expired' };
    }

    // Check passcode if required
    if (meeting.settings.requirePasscode && meeting.passcode !== passcode) {
      return { success: false, error: 'Invalid passcode' };
    }

    // Check participant limit
    if (meeting.participants.size >= meeting.maxParticipants) {
      return { success: false, error: 'Meeting is full' };
    }

    // Add participant
    meeting.participants.add(socketId);
    this.participants.set(socketId, {
      anonId,
      meetingId,
      joinedAt: Date.now(),
      role: meeting.createdBy === anonId ? 'host' : 'participant'
    });

    // Start meeting if not already active
    if (!meeting.isActive) {
      meeting.isActive = true;
      meeting.metadata.startedAt = Date.now();
    }

    meeting.metadata.participantCount = meeting.participants.size;

    console.log(`📅 ${anonId} joined meeting: ${meetingId}`);

    return {
      success: true,
      meetingId,
      meeting: this.sanitizeMeeting(meeting),
      participantRole: this.participants.get(socketId).role,
      participants: this.getMeetingParticipants(meetingId)
    };
  }

  // Leave a meeting
  leaveMeeting(socketId) {
    const participant = this.participants.get(socketId);
    
    if (!participant) {
      return { success: false, error: 'Participant not found' };
    }

    const { anonId, meetingId } = participant;
    const meeting = this.meetings.get(meetingId);

    if (meeting) {
      meeting.participants.delete(socketId);
      meeting.metadata.participantCount = meeting.participants.size;

      console.log(`📅 ${anonId} left meeting: ${meetingId}`);

      // End meeting if no participants left
      if (meeting.participants.size === 0) {
        meeting.isActive = false;
        meeting.metadata.endedAt = Date.now();
        meeting.metadata.totalDuration = meeting.metadata.endedAt - meeting.metadata.startedAt;

        // Auto-delete if enabled
        if (meeting.settings.autoDelete) {
          setTimeout(() => {
            this.meetings.delete(meetingId);
            console.log(`📅 Meeting auto-deleted: ${meetingId}`);
          }, 300000); // 5 minutes delay
        }
      }
    }

    this.participants.delete(socketId);

    return {
      success: true,
      meetingId,
      participantCount: meeting ? meeting.participants.size : 0
    };
  }

  // Get meeting information
  getMeetingInfo(meetingId) {
    const meeting = this.meetings.get(meetingId);
    
    if (!meeting) {
      return { success: false, error: 'Meeting not found' };
    }

    if (this.isMeetingExpired(meeting)) {
      this.meetings.delete(meetingId);
      return { success: false, error: 'Meeting has expired' };
    }

    return {
      success: true,
      meeting: this.sanitizeMeeting(meeting),
      participants: this.getMeetingParticipants(meetingId)
    };
  }

  // Get meetings created by a user
  getUserMeetings(anonId) {
    const userMeetings = [];
    
    for (const [meetingId, meeting] of this.meetings) {
      if (meeting.createdBy === anonId && !this.isMeetingExpired(meeting)) {
        userMeetings.push(this.sanitizeMeeting(meeting));
      }
    }

    return {
      success: true,
      meetings: userMeetings,
      count: userMeetings.length
    };
  }

  // Update meeting settings (host only)
  updateMeeting(socketId, meetingId, updates) {
    const participant = this.participants.get(socketId);
    const meeting = this.meetings.get(meetingId);
    
    if (!participant || !meeting) {
      return { success: false, error: 'Meeting or participant not found' };
    }

    if (participant.role !== 'host') {
      return { success: false, error: 'Only host can update meeting settings' };
    }

    // Update allowed fields
    const allowedUpdates = ['title', 'maxParticipants', 'allowScreenShare', 'allowChat'];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        if (key === 'title' || key === 'maxParticipants') {
          meeting[key] = value;
        } else {
          meeting.settings[key] = value;
        }
      }
    }

    console.log(`📅 Meeting updated: ${meetingId} by ${participant.anonId}`);

    return {
      success: true,
      meeting: this.sanitizeMeeting(meeting)
    };
  }

  // End meeting (host only)
  endMeeting(socketId, meetingId) {
    const participant = this.participants.get(socketId);
    const meeting = this.meetings.get(meetingId);
    
    if (!participant || !meeting) {
      return { success: false, error: 'Meeting or participant not found' };
    }

    if (participant.role !== 'host') {
      return { success: false, error: 'Only host can end the meeting' };
    }

    meeting.isActive = false;
    meeting.metadata.endedAt = Date.now();
    meeting.metadata.totalDuration = meeting.metadata.endedAt - (meeting.metadata.startedAt || Date.now());

    // Clear all participants
    const participantIds = Array.from(meeting.participants);
    meeting.participants.clear();
    meeting.metadata.participantCount = 0;

    console.log(`📅 Meeting ended: ${meetingId} by ${participant.anonId}`);

    // Auto-delete after 5 minutes
    setTimeout(() => {
      this.meetings.delete(meetingId);
      console.log(`📅 Meeting deleted: ${meetingId}`);
    }, 300000);

    return {
      success: true,
      meetingId,
      participantIds
    };
  }

  // Get meeting participants
  getMeetingParticipants(meetingId) {
    const meeting = this.meetings.get(meetingId);
    
    if (!meeting) {
      return [];
    }

    const participants = [];
    
    for (const socketId of meeting.participants) {
      const participant = this.participants.get(socketId);
      if (participant) {
        participants.push({
          anonId: participant.anonId,
          role: participant.role,
          joinedAt: participant.joinedAt
        });
      }
    }

    return participants;
  }

  // Check if meeting has expired
  isMeetingExpired(meeting) {
    const now = Date.now();
    const expiryTime = meeting.scheduledFor + meeting.duration + 3600000; // 1 hour grace period
    
    return now > expiryTime;
  }

  // Generate secure passcode
  generatePasscode() {
    return crypto.randomBytes(3).toString('hex').toUpperCase();
  }

  // Sanitize meeting data for client
  sanitizeMeeting(meeting) {
    return {
      id: meeting.id,
      title: meeting.title,
      createdAt: meeting.createdAt,
      scheduledFor: meeting.scheduledFor,
      duration: meeting.duration,
      maxParticipants: meeting.maxParticipants,
      isActive: meeting.isActive,
      settings: { ...meeting.settings },
      metadata: { ...meeting.metadata },
      // Don't send passcode or createdBy for security
    };
  }

  // Get all active meetings (for debugging)
  getAllMeetings() {
    const meetings = [];
    
    for (const [meetingId, meeting] of this.meetings) {
      if (!this.isMeetingExpired(meeting)) {
        meetings.push({
          id: meetingId,
          title: meeting.title,
          isActive: meeting.isActive,
          participantCount: meeting.participants.size,
          maxParticipants: meeting.maxParticipants,
          createdAt: meeting.createdAt,
          scheduledFor: meeting.scheduledFor
        });
      }
    }

    return meetings;
  }

  // Clean up expired meetings
  cleanupExpiredMeetings() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [meetingId, meeting] of this.meetings) {
      if (this.isMeetingExpired(meeting)) {
        this.meetings.delete(meetingId);
        cleanedCount++;
        console.log(`📅 Expired meeting deleted: ${meetingId}`);
      }
    }

    return cleanedCount;
  }

  // Handle meeting chat messages
  handleMeetingMessage(socketId, message) {
    const participant = this.participants.get(socketId);
    
    if (!participant) {
      return { success: false, error: 'Participant not found' };
    }

    const meeting = this.meetings.get(participant.meetingId);
    
    if (!meeting || !meeting.settings.allowChat) {
      return { success: false, error: 'Chat not allowed in this meeting' };
    }

    const messageData = {
      id: Date.now(),
      anonId: participant.anonId,
      text: message,
      timestamp: Date.now(),
      type: 'chat'
    };

    console.log(`📅 Meeting chat from ${participant.anonId} in ${participant.meetingId}: ${message}`);

    return {
      success: true,
      meetingId: participant.meetingId,
      message: messageData,
      participants: Array.from(meeting.participants)
    };
  }
}

module.exports = new MeetingService();

