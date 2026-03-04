package com.talksy.controller;

import com.talksy.dto.FriendRequestDto;
import com.talksy.dto.SendFriendRequestDto;
import com.talksy.dto.UserDto;
import com.talksy.model.FriendRequest;
import com.talksy.model.User;
import com.talksy.repository.FriendRequestRepository;
import com.talksy.repository.UserRepository;
import com.talksy.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/friends")
@CrossOrigin(origins = "*")
public class FriendRequestController {

    @Autowired
    private FriendRequestRepository friendRequestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @PostMapping("/send-request")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> sendFriendRequest(
            @RequestHeader("Authorization") String token,
            @RequestBody SendFriendRequestDto request) {
        
        Map<String, String> response = new HashMap<>();
        
        try {
            System.out.println("DEBUG: Received friend request - receiverEmail: " + request.getReceiverEmail() + 
                             ", receiverUsername: " + request.getReceiverUsername());
                             
            String jwtToken = token.replace("Bearer ", "");
            String senderEmail = jwtUtils.getEmailFromJwtToken(jwtToken);
            
            System.out.println("DEBUG: Sender email from JWT: " + senderEmail);
            
            Optional<User> senderOpt = userRepository.findByEmail(senderEmail);
            if (!senderOpt.isPresent()) {
                response.put("message", "Sender not found");
                return ResponseEntity.badRequest().body(response);
            }
            
            User sender = senderOpt.get();
            
            // Find receiver by email or username
            Optional<User> receiverOpt;
            if (request.getReceiverEmail() != null && !request.getReceiverEmail().isEmpty()) {
                receiverOpt = userRepository.findByEmail(request.getReceiverEmail());
            } else if (request.getReceiverUsername() != null && !request.getReceiverUsername().isEmpty()) {
                receiverOpt = userRepository.findByUsername(request.getReceiverUsername());
            } else {
                response.put("message", "Please provide either email or username");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (!receiverOpt.isPresent()) {
                response.put("message", "User not found");
                return ResponseEntity.badRequest().body(response);
            }
            
            User receiver = receiverOpt.get();
            
            // Check if trying to send request to themselves
            if (sender.getId().equals(receiver.getId())) {
                response.put("message", "Cannot send friend request to yourself");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Check if friend request already exists
            Optional<FriendRequest> existingRequest = friendRequestRepository.findBetweenUsers(sender.getId(), receiver.getId());
            if (existingRequest.isPresent()) {
                FriendRequest existing = existingRequest.get();
                System.out.println("DEBUG: Existing friend request found with status: " + existing.getStatus());
                if (existing.getStatus() == FriendRequest.FriendRequestStatus.PENDING) {
                    response.put("message", "Friend request already sent");
                    return ResponseEntity.badRequest().body(response);
                } else if (existing.getStatus() == FriendRequest.FriendRequestStatus.ACCEPTED) {
                    response.put("message", "You are already friends");
                    return ResponseEntity.badRequest().body(response);
                }
            }
            
            // Create new friend request
            FriendRequest friendRequest = new FriendRequest(sender, receiver);
            friendRequestRepository.save(friendRequest);
            
            response.put("message", "Friend request sent successfully");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("message", "Error sending friend request: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/accept/{requestId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> acceptFriendRequest(
            @RequestHeader("Authorization") String token,
            @PathVariable Long requestId) {
        
        Map<String, String> response = new HashMap<>();
        
        try {
            String jwtToken = token.replace("Bearer ", "");
            String userEmail = jwtUtils.getEmailFromJwtToken(jwtToken);
            
            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            Optional<FriendRequest> requestOpt = friendRequestRepository.findById(requestId);
            
            if (!userOpt.isPresent() || !requestOpt.isPresent()) {
                response.put("message", "Request not found");
                return ResponseEntity.badRequest().body(response);
            }
            
            User user = userOpt.get();
            FriendRequest friendRequest = requestOpt.get();
            
            // Check if user is the receiver of this request
            if (!friendRequest.getReceiver().getId().equals(user.getId())) {
                response.put("message", "Unauthorized");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Update request status
            friendRequest.setStatus(FriendRequest.FriendRequestStatus.ACCEPTED);
            friendRequestRepository.save(friendRequest);
            
            response.put("message", "Friend request accepted");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("message", "Error accepting friend request: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/decline/{requestId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> declineFriendRequest(
            @RequestHeader("Authorization") String token,
            @PathVariable Long requestId) {
        
        Map<String, String> response = new HashMap<>();
        
        try {
            String jwtToken = token.replace("Bearer ", "");
            String userEmail = jwtUtils.getEmailFromJwtToken(jwtToken);
            
            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            Optional<FriendRequest> requestOpt = friendRequestRepository.findById(requestId);
            
            if (!userOpt.isPresent() || !requestOpt.isPresent()) {
                response.put("message", "Request not found");
                return ResponseEntity.badRequest().body(response);
            }
            
            User user = userOpt.get();
            FriendRequest friendRequest = requestOpt.get();
            
            // Check if user is the receiver of this request
            if (!friendRequest.getReceiver().getId().equals(user.getId())) {
                response.put("message", "Unauthorized");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Update request status
            friendRequest.setStatus(FriendRequest.FriendRequestStatus.DECLINED);
            friendRequestRepository.save(friendRequest);
            
            response.put("message", "Friend request declined");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("message", "Error declining friend request: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/requests/received")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<FriendRequestDto>> getReceivedRequests(@RequestHeader("Authorization") String token) {
        try {
            String jwtToken = token.replace("Bearer ", "");
            String userEmail = jwtUtils.getEmailFromJwtToken(jwtToken);
            
            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            if (!userOpt.isPresent()) {
                return ResponseEntity.badRequest().build();
            }
            
            User user = userOpt.get();
            List<FriendRequest> requests = friendRequestRepository.findByReceiverAndStatus(
                user, FriendRequest.FriendRequestStatus.PENDING);
            
            List<FriendRequestDto> requestDtos = requests.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(requestDtos);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/requests/sent")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<FriendRequestDto>> getSentRequests(@RequestHeader("Authorization") String token) {
        try {
            String jwtToken = token.replace("Bearer ", "");
            String userEmail = jwtUtils.getEmailFromJwtToken(jwtToken);
            
            Optional<User> userOpt = userRepository.findByEmail(userEmail);
            if (!userOpt.isPresent()) {
                return ResponseEntity.badRequest().build();
            }
            
            User user = userOpt.get();
            List<FriendRequest> requests = friendRequestRepository.findBySenderAndStatus(
                user, FriendRequest.FriendRequestStatus.PENDING);
            
            List<FriendRequestDto> requestDtos = requests.stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(requestDtos);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/check-status/{userId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> checkFriendRequestStatus(
            @RequestHeader("Authorization") String token,
            @PathVariable Long userId) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            String jwtToken = token.replace("Bearer ", "");
            String currentUserEmail = jwtUtils.getEmailFromJwtToken(jwtToken);
            
            Optional<User> currentUserOpt = userRepository.findByEmail(currentUserEmail);
            if (!currentUserOpt.isPresent()) {
                response.put("error", "Current user not found");
                return ResponseEntity.badRequest().body(response);
            }
            
            User currentUser = currentUserOpt.get();
            
            // Check if friend request exists between users
            Optional<FriendRequest> existingRequest = friendRequestRepository.findBetweenUsers(currentUser.getId(), userId);
            
            if (existingRequest.isPresent()) {
                FriendRequest request = existingRequest.get();
                response.put("hasRelationship", true);
                response.put("status", request.getStatus().toString());
                response.put("isSender", request.getSender().getId().equals(currentUser.getId()));
                response.put("isReceiver", request.getReceiver().getId().equals(currentUser.getId()));
            } else {
                response.put("hasRelationship", false);
                response.put("status", null);
            }
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            response.put("error", "Error checking friend request status: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    private FriendRequestDto convertToDto(FriendRequest request) {
        UserDto senderDto = new UserDto(
            request.getSender().getId(),
            request.getSender().getUsername(),
            request.getSender().getEmail(),
            request.getSender().getAvatarUrl(),
            request.getSender().isOnline(),
            request.getSender().getLastSeen()
        );
        
        UserDto receiverDto = new UserDto(
            request.getReceiver().getId(),
            request.getReceiver().getUsername(),
            request.getReceiver().getEmail(),
            request.getReceiver().getAvatarUrl(),
            request.getReceiver().isOnline(),
            request.getReceiver().getLastSeen()
        );
        
        return new FriendRequestDto(
            request.getId(),
            senderDto,
            receiverDto,
            request.getStatus(),
            request.getCreatedAt(),
            request.getUpdatedAt()
        );
    }
}