package com.talksy.controller;

import com.talksy.dto.MessageDto;
import com.talksy.model.Call;
import com.talksy.model.Message;
import com.talksy.model.User;
import com.talksy.repository.CallRepository;
import com.talksy.repository.MessageRepository;
import com.talksy.repository.UserRepository;
import com.talksy.repository.MessageReactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Controller
public class WebSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MessageReactionRepository messageReactionRepository;

    @Autowired
    private CallRepository callRepository;

    // Real-time typing indicators
    private final Map<String, Map<String, Boolean>> typingStatus = new ConcurrentHashMap<>();

    // User online status tracking
    private final Map<String, LocalDateTime> userLastSeen = new ConcurrentHashMap<>();

    // Active calls tracking (key: "caller_receiver" or "receiver_caller", value:
    // Call ID)
    private final Map<String, Long> activeCalls = new ConcurrentHashMap<>();

    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload Map<String, Object> chatMessage, Principal principal) {
        String senderUsername = principal.getName();
        String messageType = (String) chatMessage.get("type");

        if ("REACTION".equals(messageType)) {
            handleReaction(chatMessage, principal);
            return;
        }

        String receiverUsername = (String) chatMessage.get("to");
        String content = (String) chatMessage.get("text");

        User sender = userRepository.findByUsername(senderUsername).orElse(null);
        User receiver = userRepository.findByUsername(receiverUsername).orElse(null);

        if (sender != null && receiver != null) {
            Message message = new Message();
            message.setContent(content);
            message.setSender(sender);
            message.setReceiver(receiver);
            message.setCreatedAt(LocalDateTime.now());

            // Set message type (TEXT, FILE, IMAGE, AUDIO, VIDEO)
            if (messageType != null) {
                try {
                    message.setType(Message.MessageType.valueOf(messageType.toUpperCase()));
                } catch (IllegalArgumentException e) {
                    message.setType(Message.MessageType.TEXT);
                }
            } else {
                message.setType(Message.MessageType.TEXT);
            }

            // Handle file messages
            if (chatMessage.containsKey("fileUrl")) {
                message.setFileUrl((String) chatMessage.get("fileUrl"));
                message.setFileName((String) chatMessage.get("fileName"));
                message.setFileType((String) chatMessage.get("fileType"));
            }

            messageRepository.save(message);

            // Clear typing indicator when message is sent
            clearTypingIndicator(senderUsername, receiverUsername);

            // Send to receiver with delivery status
            MessageDto messageDto = createMessageDto(message);
            messagingTemplate.convertAndSendToUser(
                    receiverUsername,
                    "/queue/messages",
                    messageDto);

            // Send delivery confirmation to sender
            message.setStatus(Message.MessageStatus.DELIVERED);
            messageRepository.save(message);

            messagingTemplate.convertAndSendToUser(
                    senderUsername,
                    "/queue/status",
                    Map.of("messageId", message.getId(), "status", "DELIVERED"));
        }
    }

    private void handleReaction(Map<String, Object> data, Principal principal) {
        String senderUsername = principal.getName();
        String receiverUsername = (String) data.get("to");
        Long messageId = ((Number) data.get("messageId")).longValue();
        String emoji = (String) data.get("emoji");

        Message message = messageRepository.findById(messageId).orElse(null);
        User user = userRepository.findByUsername(senderUsername).orElse(null);

        if (message != null && user != null) {
            // Save reaction
            java.util.Optional<com.talksy.model.MessageReaction> existing = messageReactionRepository
                    .findByMessageAndUser(message, user);
            if (existing.isPresent()) {
                existing.get().setEmoji(emoji);
                messageReactionRepository.save(existing.get());
            } else {
                com.talksy.model.MessageReaction reaction = new com.talksy.model.MessageReaction(message, user, emoji);
                messageReactionRepository.save(reaction);
            }

            // Broadcast to receiver
            messagingTemplate.convertAndSendToUser(
                    receiverUsername,
                    "/queue/reaction",
                    Map.of("messageId", messageId, "from", senderUsername, "emoji", emoji));

            // Broadcast to sender (so they know it was processed)
            messagingTemplate.convertAndSendToUser(
                    senderUsername,
                    "/queue/reaction",
                    Map.of("messageId", messageId, "from", senderUsername, "emoji", emoji));
        }
    }

    @MessageMapping("/chat.addUser")
    public void addUser(@Payload Map<String, Object> chatMessage,
            SimpMessageHeaderAccessor headerAccessor,
            Principal principal) {
        if (principal == null) {
            System.out.println("Warning: addUser called without authentication");
            return;
        }
        String username = principal.getName();

        Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
        if (sessionAttributes != null) {
            sessionAttributes.put("username", username);
        }

        // Update user online status and last seen
        userLastSeen.put(username, LocalDateTime.now());
        User user = userRepository.findByUsername(username).orElse(null);
        if (user != null) {
            userRepository.updateUserOnlineStatus(user.getId(), true, LocalDateTime.now());
        }

        // Broadcast user joined to all
        messagingTemplate.convertAndSend("/topic/presence", Map.of(
                "username", username,
                "isOnline", true,
                "lastSeen", userLastSeen.get(username)));
    }

    @MessageMapping("/webrtc.signal")
    public void handleWebRTCSignal(@Payload Map<String, Object> signal, Principal principal) {
        if (principal == null) {
            System.out.println("Warning: handleWebRTCSignal called without authentication");
            return;
        }

        // Support both 'target' and 'to' for compatibility
        String targetUser = (String) signal.get("target");
        if (targetUser == null) {
            targetUser = (String) signal.get("to");
        }

        if (targetUser == null) {
            System.err.println("Error: No target specified in WebRTC signal from " + principal.getName());
            return;
        }

        signal.put("from", principal.getName());

        System.out.println("Signal type: " + signal.get("type") + " from " + principal.getName() + " to " + targetUser);
        messagingTemplate.convertAndSendToUser(targetUser, "/queue/webrtc", signal);
    }

    // Feature 2: Real-time typing indicators
    @MessageMapping("/chat.typing")
    public void handleTyping(@Payload Map<String, Object> typingData, Principal principal) {
        if (principal == null) {
            return;
        }
        String senderUsername = principal.getName();
        String receiverUsername = (String) typingData.get("to");
        boolean isTyping = (Boolean) typingData.get("isTyping");

        setTypingIndicator(senderUsername, receiverUsername, isTyping);

        messagingTemplate.convertAndSendToUser(
                receiverUsername,
                "/queue/typing",
                Map.of("from", senderUsername, "isTyping", isTyping));
    }

    // Feature 1: Mark message as read and send read receipt
    @MessageMapping("/chat.markAsRead")
    public void markAsRead(@Payload Map<String, Object> readData, Principal principal) {
        if (principal == null) {
            return;
        }
        String readerUsername = principal.getName();
        Long messageId = Long.valueOf(readData.get("messageId").toString());

        Message message = messageRepository.findById(messageId).orElse(null);
        if (message != null && message.getReceiver().getUsername().equals(readerUsername)) {
            message.setStatus(Message.MessageStatus.READ);
            message.setReadAt(LocalDateTime.now());
            messageRepository.save(message);

            // Send read receipt to sender
            messagingTemplate.convertAndSendToUser(
                    message.getSender().getUsername(),
                    "/queue/readReceipt",
                    Map.of("messageId", messageId, "status", "READ", "readAt", message.getReadAt()));
        }
    }

    // Feature 5: Voice message support
    @MessageMapping("/chat.voiceMessage")
    public void sendVoiceMessage(@Payload Map<String, Object> voiceData, Principal principal) {
        if (principal == null) {
            return;
        }
        String senderUsername = principal.getName();
        String receiverUsername = (String) voiceData.get("to");
        String audioUrl = (String) voiceData.get("audioUrl");
        Integer duration = (Integer) voiceData.get("duration");

        User sender = userRepository.findByUsername(senderUsername).orElse(null);
        User receiver = userRepository.findByUsername(receiverUsername).orElse(null);

        if (sender != null && receiver != null) {
            Message message = new Message();
            message.setContent("Voice message - " + duration + "s");
            message.setSender(sender);
            message.setReceiver(receiver);
            message.setType(Message.MessageType.AUDIO);
            message.setFileUrl(audioUrl);
            message.setFileType("audio/webm");
            message.setCreatedAt(LocalDateTime.now());

            messageRepository.save(message);

            messagingTemplate.convertAndSendToUser(
                    receiverUsername,
                    "/queue/messages",
                    createMessageDto(message));
        }
    }

    // User presence management
    @MessageMapping("/chat.updatePresence")
    public void updatePresence(@Payload Map<String, Object> presenceData, Principal principal) {
        if (principal == null) {
            return;
        }
        String username = principal.getName();
        boolean isOnline = (Boolean) presenceData.get("isOnline");

        userLastSeen.put(username, LocalDateTime.now());

        User user = userRepository.findByUsername(username).orElse(null);
        if (user != null) {
            userRepository.updateUserOnlineStatus(user.getId(), isOnline, LocalDateTime.now());
        }

        // Broadcast presence to all user's contacts
        messagingTemplate.convertAndSend("/topic/presence", Map.of(
                "username", username,
                "isOnline", isOnline,
                "lastSeen", userLastSeen.get(username)));
    }

    private void setTypingIndicator(String sender, String receiver, boolean isTyping) {
        typingStatus.computeIfAbsent(sender, k -> new HashMap<>()).put(receiver, isTyping);
    }

    private void clearTypingIndicator(String sender, String receiver) {
        Map<String, Boolean> senderTyping = typingStatus.get(sender);
        if (senderTyping != null) {
            senderTyping.remove(receiver);
            if (senderTyping.isEmpty()) {
                typingStatus.remove(sender);
            }
        }
    }

    // Call Management Endpoints
    @MessageMapping("/call.invite")
    public void handleCallInvitation(@Payload Map<String, Object> callData, Principal principal) {
        if (principal == null) {
            System.out.println("Warning: handleCallInvitation called without authentication");
            return;
        }
        String callerUsername = principal.getName();
        String receiverUsername = (String) callData.get("to");
        String callType = (String) callData.get("callType"); // "voice" or "video"

        System.out.println(
                "📞 Call invitation from " + callerUsername + " to " + receiverUsername + " (Type: " + callType + ")");
        if (receiverUsername == null) {
            System.err.println("❌ Error: Receiver username (to) is missing in invitation payload!");
            return;
        }

        // Create call record in database
        try {
            User caller = userRepository.findByUsername(callerUsername).orElse(null);
            User receiver = userRepository.findByUsername(receiverUsername).orElse(null);

            if (caller != null && receiver != null) {
                Call call = new Call();
                call.setCaller(caller);
                call.setReceiver(receiver);
                call.setType("video".equalsIgnoreCase(callType) ? Call.CallType.VIDEO : Call.CallType.VOICE);
                call.setStatus(Call.CallStatus.INITIATED);
                Call savedCall = callRepository.save(call);

                // Track active call
                String callKey = callerUsername + "_" + receiverUsername;
                activeCalls.put(callKey, savedCall.getId());
                System.out.println("📝 Call logged with ID: " + savedCall.getId());
            }
        } catch (Exception e) {
            System.err.println("Failed to log call: " + e.getMessage());
        }

        messagingTemplate.convertAndSendToUser(
                receiverUsername,
                "/queue/calls",
                Map.of(
                        "type", "CALL_INVITATION",
                        "from", callerUsername,
                        "callType", callType,
                        "timestamp", LocalDateTime.now().toString()));
    }

    @MessageMapping("/call.accept")
    public void handleCallAcceptance(@Payload Map<String, Object> callData, Principal principal) {
        if (principal == null) {
            return;
        }
        String accepterUsername = principal.getName();
        String callerUsername = (String) callData.get("to");

        System.out.println("✅ Call accepted by " + accepterUsername + " targeting caller: " + callerUsername);
        if (callerUsername == null || callerUsername.isEmpty()) {
            System.err.println("❌ Error: Caller username (to) is missing in accept payload!");
            return;
        }

        messagingTemplate.convertAndSendToUser(
                callerUsername,
                "/queue/calls",
                Map.of(
                        "type", "CALL_ACCEPTED",
                        "from", accepterUsername,
                        "timestamp", LocalDateTime.now().toString()));
    }

    @MessageMapping("/call.reject")
    public void handleCallRejection(@Payload Map<String, Object> callData, Principal principal) {
        if (principal == null) {
            return;
        }
        String rejecterUsername = principal.getName();
        String callerUsername = (String) callData.get("to");

        System.out.println("❌ Call rejected by " + rejecterUsername + " from " + callerUsername);

        messagingTemplate.convertAndSendToUser(
                callerUsername,
                "/queue/calls",
                Map.of(
                        "type", "CALL_REJECTED",
                        "from", rejecterUsername,
                        "timestamp", LocalDateTime.now().toString()));
    }

    @MessageMapping("/call.end")
    public void handleCallEnd(@Payload Map<String, Object> callData, Principal principal) {
        if (principal == null) {
            return;
        }
        String enderUsername = principal.getName();
        String otherUsername = (String) callData.get("to");

        System.out.println("📴 Call ended by " + enderUsername + " with " + otherUsername);

        // Update call record in database
        try {
            // Check both possible call keys (either person could have initiated)
            String callKey1 = enderUsername + "_" + otherUsername;
            String callKey2 = otherUsername + "_" + enderUsername;
            Long callId = activeCalls.remove(callKey1);
            if (callId == null) {
                callId = activeCalls.remove(callKey2);
            }

            if (callId != null) {
                callRepository.findById(callId).ifPresent(call -> {
                    call.setStatus(Call.CallStatus.ENDED);
                    call.setEndedAt(LocalDateTime.now());

                    // Calculate duration
                    if (call.getStartedAt() != null) {
                        long durationSeconds = java.time.Duration.between(call.getStartedAt(), call.getEndedAt())
                                .getSeconds();
                        call.setDurationSeconds(durationSeconds);
                    }

                    callRepository.save(call);
                    System.out.println(
                            "📝 Call " + call.getId() + " ended. Duration: " + call.getDurationSeconds() + "s");
                });
            }
        } catch (Exception e) {
            System.err.println("Failed to update call log: " + e.getMessage());
        }

        messagingTemplate.convertAndSendToUser(
                otherUsername,
                "/queue/calls",
                Map.of(
                        "type", "CALL_END",
                        "from", enderUsername,
                        "timestamp", LocalDateTime.now().toString()));
    }

    private MessageDto createMessageDto(Message message) {
        MessageDto dto = new MessageDto();
        dto.setId(message.getId());
        dto.setContent(message.getContent());
        dto.setSenderUsername(message.getSender().getUsername());
        dto.setReceiverUsername(message.getReceiver().getUsername());
        dto.setType(message.getType());
        dto.setStatus(message.getStatus());
        dto.setCreatedAt(message.getCreatedAt());
        dto.setReadAt(message.getReadAt());
        dto.setFileUrl(message.getFileUrl());
        dto.setFileName(message.getFileName());
        dto.setFileType(message.getFileType());

        Map<String, String> reactions = message.getReactions().stream()
                .collect(Collectors.toMap(
                        r -> r.getUser().getUsername(),
                        com.talksy.model.MessageReaction::getEmoji,
                        (existing, replacement) -> replacement));
        dto.setReactions(reactions);

        return dto;
    }
}