
from .models import User, Post, Comment
from django.test import TestCase

class PostTest(TestCase):

    def setUp(self):
        self.users_count = 5

        self.user_author = User.objects.create(
            username="user",
            password="123",
        )

        self.users = [User.objects.create(
            username=f"user_{i}"
        ) for i in range(self.users_count)]

    def test_post_create(self):
        post = Post.objects.create(
            author=self.user_author,
            title="Hello",
            body="Test post"
        )

        self.assertEqual(post.author, self.user_author)
        self.assertEqual(post.title, "Hello")
        self.assertEqual(self.user_author.posts.count(), 1)

    def test_post_likes(self):
        post = Post.objects.create(
            author=self.user_author,
            title="Test likes",
            body="Test likes"
        )

        for i in range(self.users_count):
            post.likes.add(User.objects.create(
                username=f"{i}",
                password="123"
            ))

        self.assertEqual(post.likes.count(), self.users_count)

    def test_post_cannot_one_user_likes_twice(self):
        post = Post.objects.create(
            author=self.user_author,
            title="Test likes",
            body="Test likes"
        )

        post.likes.add(self.users[0])
        post.likes.add(self.users[0])
        self.assertEqual(post.likes.count(), 1)

    def test_post_create_comments(self):
        post = Post.objects.create(
            author=self.user_author,
            title="Test comments",
            body="Test comments"
        )

        for i in self.users:
            post.comments.add(Comment.objects.create(
                author=i,
                body=f"My name is {i}"
            ))

        self.assertEqual(post.comments.count(), self.users_count)


    # def test_post_guest_cannot_create_comment(self):
    #     pass
    #
    # def test_post_guest_cannot_like(self):
    #     pass
    #
    # def test_post_cannot_be_created_by_guest(self):
    #     pass
