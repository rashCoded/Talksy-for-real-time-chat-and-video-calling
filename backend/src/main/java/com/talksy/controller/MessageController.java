package com.talksy.controller;

import com.talksy.dto.MessageDto;
import com.talksy.model.Message;
import com.talksy.model.User;
import com.talksy.repository.MessageRepository;
import com.talksy.repository.UserRepository;
import com.talksy.repository.MessageReactionRepository;
import com.talksy.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/messages")
@CrossOrigin(origins = "*")
public class MessageController {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MessageReactionRepository messageReactionRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @PostMapping("/send")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> sendMessage(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> request) {

        Map<String, Object> response = new HashMap<>();

        try {
            String jwtToken = token.replace("Bearer ", "");
            String senderEmail = jwtUtils.getEmailFromJwtToken(jwtToken);

            Optional<User> senderOpt = userRepository.findByEmail(senderEmail);
            if (!senderOpt.isPresent()) {
                response.put("error", "Sender not found");
                return ResponseEntity.badRequest().body(response);
            }

            User sender = senderOpt.get();

            // Get receiver by username or email
            String receiverIdentifier = (String) request.get("receiverUsername");
            if (receiverIdentifier == null) {
                receiverIdentifier = (String) request.get("receiverEmail");
            }

            if (receiverIdentifier == null) {
                response.put("error", "Receiver identifier required");
                return ResponseEntity.badRequest().body(response);
            }

            Optional<User> receiverOpt = userRepository.findByUsername(receiverIdentifier);
            if (!receiverOpt.isPresent()) {
                receiverOpt = userRepository.findByEmail(receiverIdentifier);
            }

            if (!receiverOpt.isPresent()) {
                response.put("error", "Receiver not found");
                return ResponseEntity.badRequest().body(response);
            }

            User receiver = receiverOpt.get();
            String content = (String) request.get("content");

            if (content == null || content.trim().isEmpty()) {
                response.put("error", "Message content required");
                return ResponseEntity.badRequest().body(response);
            }

            // Create and save message
            Message message = new Message();
            message.setSender(sender);
            message.setReceiver(receiver);
            message.setContent(content.trim());
            message.setType(Message.MessageType.TEXT);
            message.setStatus(Message.MessageStatus.SENT);

            // Handle file attachments if present
            if (request.containsKey("fileUrl")) {
                message.setFileUrl((String) request.get("fileUrl"));
                message.setFileName((String) request.get("fileName"));
                message.setFileType((String) request.get("fileType"));
                message.setType(Message.MessageType.FILE);
            }

            Message savedMessage = messageRepository.save(message);

            // Convert to DTO and return
            MessageDto messageDto = convertToDto(savedMessage);
            response.put("message", messageDto);
            response.put("success", true);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Error sending message: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/conversation/{username}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<MessageDto>> getConversation(
            @RequestHeader("Authorization") String token,
            @PathVariable String username) {

        try {
            String jwtToken = token.replace("Bearer ", "");
            String userEmail = jwtUtils.getEmailFromJwtToken(jwtToken);

            Optional<User> currentUserOpt = userRepository.findByEmail(userEmail);
            Optional<User> otherUserOpt = userRepository.findByUsername(username);

            if (!currentUserOpt.isPresent() || !otherUserOpt.isPresent()) {
                return ResponseEntity.badRequest().build();
            }

            User currentUser = currentUserOpt.get();
            User otherUser = otherUserOpt.get();

            List<Message> messages = messageRepository.findConversationBetweenUsers(currentUser, otherUser);

            // Mark messages as read if they were sent to current user
            messages.stream()
                    .filter(msg -> msg.getReceiver().equals(currentUser) && msg.getReadAt() == null)
                    .forEach(msg -> {
                        msg.setStatus(Message.MessageStatus.READ);
                        msg.setReadAt(LocalDateTime.now());
                        messageRepository.save(msg);
                    });

            List<MessageDto> messageDtos = messages.stream()
                    .map(this::convertToDto)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(messageDtos);

        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/contacts")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<Map<String, Object>>> getChatContacts(@RequestHeader("Authorization") String token) {
        try {
            String jwtToken = token.replace("Bearer ", "");
            String userEmail = jwtUtils.getEmailFromJwtToken(jwtToken);

            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            if (!userOpt.isPresent()) {
                return ResponseEntity.badRequest().build();
            }

            User user = userOpt.get();
            List<User> contacts = messageRepository.findChatContactsForUser(user);

            List<Map<String, Object>> result = contacts.stream()
                    .map(contact -> {
                        Map<String, Object> contactInfo = new HashMap<>();
                        contactInfo.put("username", contact.getUsername());
                        contactInfo.put("email", contact.getEmail());
                        contactInfo.put("avatarUrl", contact.getAvatarUrl());
                        contactInfo.put("online", contact.isOnline());

                        // Get last message
                        List<Message> conversation = messageRepository.findConversationBetweenUsers(user, contact);
                        if (!conversation.isEmpty()) {
                            Message lastMessage = conversation.get(conversation.size() - 1);
                            contactInfo.put("lastMessage", lastMessage.getContent());
                            contactInfo.put("lastMessageTime", lastMessage.getCreatedAt());
                            contactInfo.put("lastMessageSender", lastMessage.getSender().getUsername());
                        }

                        return contactInfo;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/mark-read/{messageId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> markMessageAsRead(
            @RequestHeader("Authorization") String token,
            @PathVariable Long messageId) {

        Map<String, String> response = new HashMap<>();

        try {
            String jwtToken = token.replace("Bearer ", "");
            String userEmail = jwtUtils.getEmailFromJwtToken(jwtToken);

            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            Optional<Message> messageOpt = messageRepository.findById(messageId);

            if (!userOpt.isPresent() || !messageOpt.isPresent()) {
                response.put("error", "User or message not found");
                return ResponseEntity.badRequest().body(response);
            }

            User user = userOpt.get();
            Message message = messageOpt.get();

            // Only receiver can mark message as read
            if (!message.getReceiver().equals(user)) {
                response.put("error", "Unauthorized");
                return ResponseEntity.badRequest().body(response);
            }

            message.setStatus(Message.MessageStatus.READ);
            message.setReadAt(LocalDateTime.now());
            messageRepository.save(message);

            response.put("message", "Message marked as read");
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Error marking message as read: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/reaction")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> addReaction(
            @RequestHeader("Authorization") String token,
            @RequestBody Map<String, Object> request) {

        Map<String, Object> response = new HashMap<>();

        try {
            String jwtToken = token.replace("Bearer ", "");
            String userEmail = jwtUtils.getEmailFromJwtToken(jwtToken);

            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            if (!userOpt.isPresent()) {
                response.put("error", "User not found");
                return ResponseEntity.badRequest().body(response);
            }

            User user = userOpt.get();

            Long messageId = ((Number) request.get("messageId")).longValue();
            String emoji = (String) request.get("emoji");

            Optional<Message> messageOpt = messageRepository.findById(messageId);
            if (!messageOpt.isPresent()) {
                response.put("error", "Message not found");
                return ResponseEntity.badRequest().body(response);
            }

            Message message = messageOpt.get();

            // Check if reaction already exists
            Optional<com.talksy.model.MessageReaction> existingReaction = messageReactionRepository
                    .findByMessageAndUser(message, user);

            if (existingReaction.isPresent()) {
                com.talksy.model.MessageReaction reaction = existingReaction.get();
                reaction.setEmoji(emoji);
                messageReactionRepository.save(reaction);
            } else {
                com.talksy.model.MessageReaction reaction = new com.talksy.model.MessageReaction(message, user, emoji);
                messageReactionRepository.save(reaction);
            }

            response.put("success", true);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", "Error adding reaction: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Feature 3: Advanced Message Search and Filtering
    @GetMapping("/search")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<MessageDto>> searchMessages(
            @RequestHeader("Authorization") String token,
            @RequestParam String query,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String messageType,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        try {
            String jwtToken = token.replace("Bearer ", "");
            String userEmail = jwtUtils.getEmailFromJwtToken(jwtToken);

            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            if (!userOpt.isPresent()) {
                return ResponseEntity.badRequest().build();
            }

            User currentUser = userOpt.get();
            List<Message> messages;

            if (username != null && !username.isEmpty()) {
                // Search in specific conversation
                Optional<User> otherUserOpt = userRepository.findByUsername(username);
                if (!otherUserOpt.isPresent()) {
                    return ResponseEntity.badRequest().build();
                }
                User otherUser = otherUserOpt.get();
                messages = messageRepository.searchMessagesInConversation(currentUser, otherUser, query);
            } else {
                // Search in all user's messages
                messages = messageRepository.searchUserMessages(currentUser, query);
            }

            // Apply additional filters
            if (messageType != null && !messageType.isEmpty()) {
                try {
                    Message.MessageType type = Message.MessageType.valueOf(messageType.toUpperCase());
                    messages = messages.stream()
                            .filter(msg -> msg.getType() == type)
                            .collect(Collectors.toList());
                } catch (IllegalArgumentException e) {
                    // Invalid message type, ignore filter
                }
            }

            // Apply pagination
            int fromIndex = page * size;
            int toIndex = Math.min(fromIndex + size, messages.size());
            if (fromIndex >= messages.size()) {
                messages = List.of();
            } else {
                messages = messages.subList(fromIndex, toIndex);
            }

            List<MessageDto> messageDtos = messages.stream()
                    .map(this::convertToDto)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(messageDtos);

        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/statistics")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Map<String, Object>> getMessageStatistics(@RequestHeader("Authorization") String token) {
        try {
            String jwtToken = token.replace("Bearer ", "");
            String userEmail = jwtUtils.getEmailFromJwtToken(jwtToken);

            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            if (!userOpt.isPresent()) {
                return ResponseEntity.badRequest().build();
            }

            User user = userOpt.get();

            Map<String, Object> stats = new HashMap<>();
            stats.put("totalSent", messageRepository.countBySender(user));
            stats.put("totalReceived", messageRepository.countByReceiver(user));
            stats.put("totalUnread", messageRepository.countByReceiverAndStatus(user, Message.MessageStatus.SENT));
            stats.put("totalFiles", messageRepository.countByUserAndType(user, Message.MessageType.FILE));
            stats.put("totalImages", messageRepository.countByUserAndType(user, Message.MessageType.IMAGE));
            stats.put("totalVoices", messageRepository.countByUserAndType(user, Message.MessageType.AUDIO));

            return ResponseEntity.ok(stats);

        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    private MessageDto convertToDto(Message message) {
        Map<String, String> reactions = message.getReactions().stream()
                .collect(Collectors.toMap(
                        r -> r.getUser().getUsername(),
                        com.talksy.model.MessageReaction::getEmoji,
                        (existing, replacement) -> replacement));

        return new MessageDto(
                message.getId(),
                message.getContent(),
                message.getSender().getUsername(),
                message.getReceiver().getUsername(),
                message.getType(),
                message.getStatus(),
                message.getFileUrl(),
                message.getFileName(),
                message.getFileType(),
                message.getCreatedAt(),
                message.getReadAt(),
                reactions);
    }
}