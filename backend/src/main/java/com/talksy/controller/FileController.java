package com.talksy.controller;

import com.talksy.model.Message;
import com.talksy.model.User;
import com.talksy.repository.MessageRepository;
import com.talksy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "*", maxAge = 3600)
public class FileController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MessageRepository messageRepository;

    private static final String UPLOAD_DIR = "uploads/";

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam("receiverUsername") String receiverUsername,
            Authentication authentication) {

        try {
            // Validate file
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("File is empty");
            }

            // Get sender and receiver
            String senderUsername = authentication.getName();
            User sender = userRepository.findByUsername(senderUsername).orElse(null);
            User receiver = userRepository.findByUsername(receiverUsername).orElse(null);

            if (sender == null || receiver == null) {
                return ResponseEntity.badRequest().body("Invalid users");
            }

            // Create upload directory if it doesn't exist
            Path uploadPath = Paths.get(UPLOAD_DIR);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String fileExtension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String uniqueFilename = UUID.randomUUID().toString() + fileExtension;

            // Save file
            Path filePath = uploadPath.resolve(uniqueFilename);
            Files.copy(file.getInputStream(), filePath);

            // Determine message type based on file type
            String contentType = file.getContentType();
            Message.MessageType messageType = Message.MessageType.FILE;
            if (contentType != null) {
                if (contentType.startsWith("image/")) {
                    messageType = Message.MessageType.IMAGE;
                } else if (contentType.startsWith("video/")) {
                    messageType = Message.MessageType.VIDEO;
                } else if (contentType.startsWith("audio/")) {
                    messageType = Message.MessageType.AUDIO;
                }
            }

            // Create message entry
            Message message = new Message();
            message.setContent(originalFilename);
            message.setSender(sender);
            message.setReceiver(receiver);
            message.setType(messageType);
            message.setFileUrl("/api/files/download/" + uniqueFilename);
            message.setFileName(originalFilename);
            message.setFileType(contentType);
            message.setCreatedAt(LocalDateTime.now());

            messageRepository.save(message);

            // Return file info
            Map<String, Object> response = new HashMap<>();
            response.put("messageId", message.getId());
            response.put("fileUrl", message.getFileUrl());
            response.put("fileName", originalFilename);
            response.put("fileType", contentType);
            response.put("fileSize", file.getSize());
            response.put("messageType", messageType);

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("File upload failed: " + e.getMessage());
        }
    }

    @GetMapping("/download/{filename}")
    public ResponseEntity<?> downloadFile(@PathVariable String filename) {
        try {
            Path filePath = Paths.get(UPLOAD_DIR).resolve(filename);
            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            byte[] fileContent = Files.readAllBytes(filePath);
            String contentType = Files.probeContentType(filePath);

            return ResponseEntity.ok()
                    .header("Content-Type", contentType != null ? contentType : "application/octet-stream")
                    .header("Content-Disposition", "inline; filename=\"" + filename + "\"")
                    .body(fileContent);

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("File download failed");
        }
    }

    @PostMapping("/avatar")
    public ResponseEntity<?> uploadAvatar(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {

        try {
            if (file.isEmpty()) {
                return ResponseEntity.badRequest().body("File is empty");
            }

            String username = authentication.getName();
            User user = userRepository.findByUsername(username).orElse(null);
            if (user == null) {
                return ResponseEntity.badRequest().body("User not found");
            }

            // Validate file type (only images for avatars)
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                return ResponseEntity.badRequest().body("Only image files are allowed for avatars");
            }

            // Create upload directory
            Path uploadPath = Paths.get(UPLOAD_DIR + "avatars/");
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename for avatar
            String fileExtension = "";
            String originalFilename = file.getOriginalFilename();
            if (originalFilename != null && originalFilename.contains(".")) {
                fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String uniqueFilename = "avatar_" + username + "_" + System.currentTimeMillis() + fileExtension;

            // Save file
            Path filePath = uploadPath.resolve(uniqueFilename);
            Files.copy(file.getInputStream(), filePath);

            // Update user avatar URL
            String avatarUrl = "/api/files/download/avatars/" + uniqueFilename;
            user.setAvatarUrl(avatarUrl);
            userRepository.save(user);

            Map<String, Object> response = new HashMap<>();
            response.put("avatarUrl", avatarUrl);
            response.put("message", "Avatar updated successfully");

            return ResponseEntity.ok(response);

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Avatar upload failed: " + e.getMessage());
        }
    }

    @GetMapping("/download/avatars/{filename}")
    public ResponseEntity<?> downloadAvatar(@PathVariable String filename) {
        try {
            Path filePath = Paths.get(UPLOAD_DIR + "avatars/").resolve(filename);
            if (!Files.exists(filePath)) {
                return ResponseEntity.notFound().build();
            }

            byte[] fileContent = Files.readAllBytes(filePath);
            String contentType = Files.probeContentType(filePath);

            return ResponseEntity.ok()
                    .header("Content-Type", contentType != null ? contentType : "image/png")
                    .header("Content-Disposition", "inline; filename=\"" + filename + "\"")
                    .body(fileContent);

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Avatar download failed");
        }
    }
}