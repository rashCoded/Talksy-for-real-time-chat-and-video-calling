package com.talksy.controller;

import com.talksy.model.Call;
import com.talksy.model.User;
import com.talksy.repository.CallRepository;
import com.talksy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/calls")
@CrossOrigin(origins = "*")
public class CallController {

    @Autowired
    private CallRepository callRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Get all call logs for the authenticated user
     */
    @GetMapping
    public ResponseEntity<?> getCallLogs(Authentication authentication) {
        try {
            String email = authentication.getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            List<Call> calls = callRepository.findCallsForUser(user);

            // Convert to DTOs to avoid lazy loading issues
            List<Map<String, Object>> callDtos = calls.stream()
                    .map(call -> {
                        Map<String, Object> dto = new HashMap<>();
                        dto.put("id", call.getId());
                        dto.put("callerUsername", call.getCaller().getUsername());
                        dto.put("receiverUsername", call.getReceiver().getUsername());
                        dto.put("type", call.getType().toString());
                        dto.put("status", call.getStatus().toString());
                        dto.put("startedAt", call.getStartedAt());
                        dto.put("endedAt", call.getEndedAt());
                        dto.put("durationSeconds", call.getDurationSeconds());

                        // Determine if this was incoming or outgoing for the current user
                        boolean isOutgoing = call.getCaller().getUsername().equals(user.getUsername());
                        dto.put("isOutgoing", isOutgoing);
                        dto.put("contactUsername",
                                isOutgoing ? call.getReceiver().getUsername() : call.getCaller().getUsername());

                        return dto;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(callDtos);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get call logs with a specific contact
     */
    @GetMapping("/{username}")
    public ResponseEntity<?> getCallLogsWithContact(
            Authentication authentication,
            @PathVariable String username) {
        try {
            String email = authentication.getName();
            User currentUser = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            User contactUser = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Contact not found"));

            List<Call> calls = callRepository.findCallsBetweenUsers(currentUser, contactUser);

            List<Map<String, Object>> callDtos = calls.stream()
                    .map(call -> {
                        Map<String, Object> dto = new HashMap<>();
                        dto.put("id", call.getId());
                        dto.put("callerUsername", call.getCaller().getUsername());
                        dto.put("receiverUsername", call.getReceiver().getUsername());
                        dto.put("type", call.getType().toString());
                        dto.put("status", call.getStatus().toString());
                        dto.put("startedAt", call.getStartedAt());
                        dto.put("endedAt", call.getEndedAt());
                        dto.put("durationSeconds", call.getDurationSeconds());

                        boolean isOutgoing = call.getCaller().getUsername().equals(currentUser.getUsername());
                        dto.put("isOutgoing", isOutgoing);
                        dto.put("contactUsername",
                                isOutgoing ? call.getReceiver().getUsername() : call.getCaller().getUsername());

                        return dto;
                    })
                    .collect(Collectors.toList());

            return ResponseEntity.ok(callDtos);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
