package com.talksy.controller;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.talksy.dto.UserDto;
import com.talksy.model.FriendRequest;
import com.talksy.model.User;
import com.talksy.repository.FriendRequestRepository;
import com.talksy.repository.UserRepository;
import com.talksy.security.JwtUtils;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FriendRequestRepository friendRequestRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @GetMapping("/contacts")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<UserDto>> getAcceptedFriends(@RequestHeader("Authorization") String token) {
        try {
            // Extract JWT token
            String jwtToken = token.replace("Bearer ", "");
            String currentEmail = jwtUtils.getEmailFromJwtToken(jwtToken);

            Optional<User> currentUserOpt = userRepository.findByEmail(currentEmail);
            if (!currentUserOpt.isPresent()) {
                System.out.println("User not found for email: " + currentEmail);
                return ResponseEntity.badRequest().build();
            }

            User currentUser = currentUserOpt.get();
            System.out.println("Fetching contacts for user: " + currentUser.getUsername());

            // Get only accepted friends
            List<FriendRequest> friendRequests = friendRequestRepository.findAcceptedFriendsForUser(currentUser.getId(),
                    FriendRequest.FriendRequestStatus.ACCEPTED);
            System.out.println("Found " + friendRequests.size() + " accepted friend requests");

            List<UserDto> contacts = friendRequests.stream()
                    .map(friendRequest -> {
                        // Get the friend (the other user in the friend request)
                        User friend = friendRequest.getSender().getId().equals(currentUser.getId())
                                ? friendRequest.getReceiver()
                                : friendRequest.getSender();

                        return new UserDto(
                                friend.getId(),
                                friend.getUsername(),
                                friend.getEmail(),
                                friend.getAvatarUrl(),
                                friend.isOnline(),
                                friend.getLastSeen());
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(contacts);
        } catch (Exception e) {
            System.err.println("Error fetching contacts: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/search")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<List<UserDto>> searchUsers(
            @RequestHeader("Authorization") String token,
            @RequestParam String query) {
        try {
            // Extract JWT token
            String jwtToken = token.replace("Bearer ", "");
            String currentEmail = jwtUtils.getEmailFromJwtToken(jwtToken);

            // Search users by username or email (excluding current user)
            List<User> users = userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(query,
                    query);
            List<UserDto> searchResults = users.stream()
                    .filter(user -> !user.getEmail().equals(currentEmail))
                    .map(user -> new UserDto(
                            user.getId(),
                            user.getUsername(),
                            user.getEmail(),
                            user.getAvatarUrl(),
                            user.isOnline(),
                            user.getLastSeen()))
                    .collect(Collectors.toList());

            return ResponseEntity.ok(searchResults);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<UserDto> getUserById(@PathVariable Long userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            UserDto userDto = new UserDto(
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    user.getAvatarUrl(),
                    user.isOnline(),
                    user.getLastSeen());
            return ResponseEntity.ok(userDto);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/status")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> updateUserStatus(
            @RequestHeader("Authorization") String token,
            @RequestParam boolean online) {
        try {
            String jwtToken = token.replace("Bearer ", "");
            String email = jwtUtils.getEmailFromJwtToken(jwtToken);

            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                user.setOnline(online);
                if (!online) {
                    user.setLastSeen(java.time.LocalDateTime.now());
                }
                userRepository.save(user);
                return ResponseEntity.ok().build();
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/profile")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> updateProfile(
            @RequestHeader("Authorization") String token,
            @org.springframework.web.bind.annotation.RequestBody java.util.Map<String, String> updates) {
        try {
            String jwtToken = token.replace("Bearer ", "");
            String email = jwtUtils.getEmailFromJwtToken(jwtToken);

            Optional<User> userOpt = userRepository.findByEmail(email);
            if (!userOpt.isPresent()) {
                return ResponseEntity.notFound().build();
            }

            User user = userOpt.get();

            // Update fields if provided
            if (updates.containsKey("username") && updates.get("username") != null) {
                String newUsername = updates.get("username").trim();
                if (!newUsername.isEmpty() && !newUsername.equals(user.getUsername())) {
                    // Check if username is taken
                    if (userRepository.existsByUsername(newUsername)) {
                        return ResponseEntity.badRequest()
                                .body(new com.talksy.dto.MessageResponse("Username already taken"));
                    }
                    user.setUsername(newUsername);
                }
            }

            if (updates.containsKey("bio")) {
                user.setBio(updates.get("bio"));
            }

            if (updates.containsKey("avatarUrl")) {
                user.setAvatarUrl(updates.get("avatarUrl"));
            }

            userRepository.save(user);

            // Return updated user info
            UserDto updatedUser = new UserDto(
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    user.getAvatarUrl(),
                    user.isOnline(),
                    user.getLastSeen());

            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(new com.talksy.dto.MessageResponse("Failed to update profile"));
        }
    }
}